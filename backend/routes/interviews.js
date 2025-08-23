import express from 'express';
import Interview from '../models/Interview.js';
import Resume from '../models/Resume.js';
import aiService from '../services/aiService.js';
import { requirePremium } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { io } from '../server.js';

const router = express.Router();

// @route   POST /api/interviews/create
// @desc    Create a new interview session
// @access  Private
router.post('/create', asyncHandler(async (req, res) => {
  const { resumeId, jobDescription, interviewType, settings } = req.body;

  // Validation
  if (!resumeId || !jobDescription || !interviewType) {
    return res.status(400).json({
      success: false,
      error: 'Resume ID, job description, and interview type are required'
    });
  }

  // Check if resume exists and belongs to user
  const resume = await Resume.findOne({
    _id: resumeId,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  if (resume.status !== 'analyzed') {
    return res.status(400).json({
      success: false,
      error: 'Resume must be analyzed before creating an interview'
    });
  }

  try {
    // Generate interview questions using AI
    const questions = await aiService.generateInterviewQuestions(
      resume.parsedData,
      jobDescription,
      interviewType,
      settings?.questionCount || 10
    );

    // Create interview session
    const interview = new Interview({
      user: req.user._id,
      resume: resumeId,
      jobDescription,
      interviewType,
      questions,
      settings: {
        questionCount: questions.length,
        timeLimit: settings?.timeLimit || 30,
        allowReplay: settings?.allowReplay !== false,
        showTimer: settings?.showTimer !== false
      },
      session: {
        totalQuestions: questions.length,
        completedQuestions: 0
      }
    });

    await interview.save();

    res.status(201).json({
      success: true,
      message: 'Interview session created successfully',
      data: {
        interview: interview.getSummary(),
        questions: questions.map(q => ({
          id: q._id,
          question: q.question,
          category: q.category,
          difficulty: q.difficulty
        }))
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   GET /api/interviews
// @desc    Get user's interview sessions
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { status, type, limit = 10, page = 1 } = req.query;

  const query = { user: req.user._id };
  if (status) query.status = status;
  if (type) query.interviewType = type;

  const interviews = await Interview.find(query)
    .populate('resume', 'originalFile.originalName')
    .sort({ 'metadata.createdAt': -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .select('interviewType status session performance metadata');

  const total = await Interview.countDocuments(query);

  res.json({
    success: true,
    data: {
      interviews: interviews.map(interview => interview.getSummary()),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    }
  });
}));

// @route   GET /api/interviews/:id
// @desc    Get specific interview details
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  }).populate('resume', 'parsedData aiAnalysis');

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  res.json({
    success: true,
    data: { interview }
  });
}));

// @route   POST /api/interviews/:id/start
// @desc    Start interview session
// @access  Private
router.post('/:id/start', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  if (interview.status !== 'scheduled') {
    return res.status(400).json({
      success: false,
      error: 'Interview can only be started when scheduled'
    });
  }

  try {
    await interview.startSession();

    // Notify connected clients
    io.to(interview._id.toString()).emit('interview-started', {
      interviewId: interview._id,
      startTime: interview.session.startTime
    });

    res.json({
      success: true,
      message: 'Interview session started',
      data: {
        interviewId: interview._id,
        startTime: interview.session.startTime,
        status: interview.status
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/response
// @desc    Submit response to interview question
// @access  Private
router.post('/:id/response', asyncHandler(async (req, res) => {
  const { questionIndex, response, nonVerbalData } = req.body;

  if (questionIndex === undefined || !response) {
    return res.status(400).json({
      success: false,
      error: 'Question index and response are required'
    });
  }

  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  if (interview.status !== 'in-progress') {
    return res.status(400).json({
      success: false,
      error: 'Interview must be in progress to submit responses'
    });
  }

  if (questionIndex >= interview.questions.length) {
    return res.status(400).json({
      success: false,
      error: 'Invalid question index'
    });
  }

  try {
    const question = interview.questions[questionIndex];
    
    // Evaluate response using AI
    const evaluation = await aiService.evaluateResponse(
      question.question,
      response.text || response,
      question.modelAnswer,
      question.expectedKeywords
    );

    // Analyze non-verbal cues if provided
    let nonVerbalAnalysis = null;
    if (nonVerbalData) {
      nonVerbalAnalysis = await aiService.analyzeNonVerbalCues(nonVerbalData);
    }

    // Add response to interview
    await interview.addQuestionResponse(
      questionIndex,
      response,
      evaluation,
      nonVerbalAnalysis
    );

    // Notify connected clients
    io.to(interview._id.toString()).emit('response-evaluated', {
      interviewId: interview._id,
      questionIndex,
      evaluation,
      nonVerbalAnalysis
    });

    res.json({
      success: true,
      message: 'Response submitted successfully',
      data: {
        evaluation,
        nonVerbalAnalysis,
        questionIndex
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/end
// @desc    End interview session
// @access  Private
router.post('/:id/end', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  if (interview.status !== 'in-progress') {
    return res.status(400).json({
      success: false,
      error: 'Interview must be in progress to end'
    });
  }

  try {
    // End session
    await interview.endSession();

    // Calculate final performance
    await interview.calculatePerformance();

    // Update user stats
    await req.user.updateStats(
      interview.performance.overallScore,
      interview.session.duration
    );

    // Notify connected clients
    io.to(interview._id.toString()).emit('interview-completed', {
      interviewId: interview._id,
      performance: interview.performance
    });

    res.json({
      success: true,
      message: 'Interview session completed',
      data: {
        interviewId: interview._id,
        performance: interview.performance,
        duration: interview.session.duration
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/interviews/:id/recording
// @desc    Upload interview recording
// @access  Private
router.post('/:id/recording', asyncHandler(async (req, res) => {
  const { videoUrl, audioUrl, thumbnailUrl, duration, fileSize } = req.body;

  if (!videoUrl || !audioUrl) {
    return res.status(400).json({
      success: false,
      error: 'Video and audio URLs are required'
    });
  }

  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  try {
    interview.recording = {
      videoUrl,
      audioUrl,
      thumbnailUrl,
      duration: duration || 0,
      fileSize: fileSize || 0
    };

    await interview.save();

    res.json({
      success: true,
      message: 'Recording uploaded successfully',
      data: {
        recording: interview.recording
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   GET /api/interviews/:id/questions
// @desc    Get interview questions
// @access  Private
router.get('/:id/questions', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  }).select('questions');

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  res.json({
    success: true,
    data: {
      questions: interview.questions.map(q => ({
        id: q._id,
        question: q.question,
        category: q.category,
        difficulty: q.difficulty,
        expectedKeywords: q.expectedKeywords
      }))
    }
  });
}));

// @route   GET /api/interviews/:id/progress
// @desc    Get interview progress
// @access  Private
router.get('/:id/progress', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  }).select('session status questions');

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  const progress = {
    status: interview.status,
    currentQuestion: interview.session.completedQuestions,
    totalQuestions: interview.session.totalQuestions,
    progress: Math.round((interview.session.completedQuestions / interview.session.totalQuestions) * 100),
    startTime: interview.session.startTime,
    duration: interview.session.duration
  };

  res.json({
    success: true,
    data: { progress }
  });
}));

// @route   DELETE /api/interviews/:id
// @desc    Delete interview session
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!interview) {
    return res.status(404).json({
      success: false,
      error: 'Interview not found'
    });
  }

  await Interview.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Interview deleted successfully'
  });
}));

export default router;

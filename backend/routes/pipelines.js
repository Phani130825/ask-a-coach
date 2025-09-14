import express from 'express';
import Pipeline from '../models/Pipeline.js';
import Resume from '../models/Resume.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Aptitude questions data (can be moved to a separate file later)
const aptitudeQuestions = [
  {
    id: 1,
    question: "If 3 apples cost $1.50, how much do 9 apples cost?",
    options: ["$4.50", "$3.00", "$5.50", "$2.25"],
    correctAnswer: "$4.50"
  },
  {
    id: 2,
    question: "What is 15% of 200?",
    options: ["30", "25", "35", "20"],
    correctAnswer: "30"
  },
  {
    id: 3,
    question: "If a train travels 120 km in 2 hours, what is its speed?",
    options: ["60 km/h", "40 km/h", "80 km/h", "100 km/h"],
    correctAnswer: "60 km/h"
  },
  {
    id: 4,
    question: "What comes next in the sequence: 2, 4, 8, 16, __?",
    options: ["24", "32", "20", "18"],
    correctAnswer: "32"
  },
  {
    id: 5,
    question: "If x + 5 = 12, what is x?",
    options: ["7", "8", "6", "9"],
    correctAnswer: "7"
  },
  {
    id: 6,
    question: "A rectangle has length 8 cm and width 5 cm. What is its area?",
    options: ["40 cm²", "26 cm²", "13 cm²", "56 cm²"],
    correctAnswer: "40 cm²"
  },
  {
    id: 7,
    question: "What is 25% of 80?",
    options: ["20", "25", "30", "15"],
    correctAnswer: "20"
  },
  {
    id: 8,
    question: "If 5 workers can complete a job in 10 days, how many days will 10 workers take?",
    options: ["5 days", "10 days", "15 days", "20 days"],
    correctAnswer: "5 days"
  },
  {
    id: 9,
    question: "What is the square root of 144?",
    options: ["12", "14", "16", "10"],
    correctAnswer: "12"
  },
  {
    id: 10,
    question: "If a book costs $20 after a 25% discount, what was the original price?",
    options: ["$25", "$26.67", "$24", "$22"],
    correctAnswer: "$26.67"
  },
  {
    id: 11,
    question: "What is 7 × 8?",
    options: ["54", "56", "58", "52"],
    correctAnswer: "56"
  },
  {
    id: 12,
    question: "If 2x + 3 = 11, what is x?",
    options: ["4", "3", "5", "2"],
    correctAnswer: "4"
  },
  {
    id: 13,
    question: "A triangle has base 10 cm and height 6 cm. What is its area?",
    options: ["30 cm²", "16 cm²", "60 cm²", "36 cm²"],
    correctAnswer: "30 cm²"
  },
  {
    id: 14,
    question: "What comes next: 1, 1, 2, 3, 5, 8, __?",
    options: ["11", "13", "10", "9"],
    correctAnswer: "13"
  },
  {
    id: 15,
    question: "If 40% of a number is 80, what is the number?",
    options: ["200", "160", "120", "240"],
    correctAnswer: "200"
  },
  {
    id: 16,
    question: "What is 144 ÷ 12?",
    options: ["12", "11", "13", "10"],
    correctAnswer: "12"
  },
  {
    id: 17,
    question: "If a car travels at 60 km/h for 3 hours, how far does it go?",
    options: ["180 km", "120 km", "240 km", "150 km"],
    correctAnswer: "180 km"
  },
  {
    id: 18,
    question: "What is 50% of 120?",
    options: ["60", "50", "70", "40"],
    correctAnswer: "60"
  },
  {
    id: 19,
    question: "If 3x = 15, what is x?",
    options: ["5", "4", "6", "3"],
    correctAnswer: "5"
  },
  {
    id: 20,
    question: "A square has side length 7 cm. What is its perimeter?",
    options: ["28 cm", "21 cm", "35 cm", "14 cm"],
    correctAnswer: "28 cm"
  },
  {
    id: 21,
    question: "What is 9²?",
    options: ["81", "72", "90", "99"],
    correctAnswer: "81"
  },
  {
    id: 22,
    question: "If 25% discount saves $10, what was the original price?",
    options: ["$40", "$50", "$30", "$60"],
    correctAnswer: "$40"
  },
  {
    id: 23,
    question: "What comes next: 3, 6, 9, 12, __?",
    options: ["15", "14", "16", "13"],
    correctAnswer: "15"
  },
  {
    id: 24,
    question: "If x - 3 = 7, what is x?",
    options: ["10", "9", "11", "8"],
    correctAnswer: "10"
  },
  {
    id: 25,
    question: "What is 100 ÷ 4?",
    options: ["25", "20", "30", "15"],
    correctAnswer: "25"
  }
];

const router = express.Router();

// @route   POST /api/pipelines
// @desc    Create a new pipeline
// @access  Private
router.post('/', asyncHandler(async (req, res) => {
  const { type, resumeId } = req.body;

  if (!type || !['tailoring', 'interview'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid pipeline type' });
  }

  const pipeline = new Pipeline({
    user: req.user._id,
    type,
    resume: resumeId || undefined,
    stages: {}
  });

  await pipeline.save();

  res.status(201).json({ success: true, data: { pipeline: { id: pipeline._id, type: pipeline.type, resume: pipeline.resume, stages: pipeline.stages, metadata: pipeline.metadata } } });
}));

// @route   GET /api/pipelines
// @desc    Get user's pipelines
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const pipelines = await Pipeline.find({ user: req.user._id })
    .populate('resume', 'status metadata originalFile')
    .sort({ 'metadata.updatedAt': -1 });

  res.json({
    success: true,
    data: {
      pipelines: pipelines.map(pipeline => ({
        id: pipeline._id,
        type: pipeline.type,
        resume: pipeline.resume,
        stages: pipeline.stages,
        metadata: pipeline.metadata,
        isComplete: pipeline.stages?.tailoring_complete || false
      }))
    }
  });
}));

// @route   GET /api/pipelines/:id
// @desc    Get specific pipeline details
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.findOne({
    _id: req.params.id,
    user: req.user._id
  }).populate('resume');

  if (!pipeline) {
    return res.status(404).json({
      success: false,
      error: 'Pipeline not found'
    });
  }

  res.json({
    success: true,
    data: { pipeline }
  });
}));

// @route   POST /api/pipelines/:id/stages
// @desc    Update pipeline stage
// @access  Private
router.post('/:id/stages', asyncHandler(async (req, res) => {
  const { stage, value = true } = req.body;

  if (!stage) {
    return res.status(400).json({
      success: false,
      error: 'Stage is required'
    });
  }

  const pipeline = await Pipeline.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!pipeline) {
    return res.status(404).json({
      success: false,
      error: 'Pipeline not found'
    });
  }

  // Update the stage
  pipeline.stages = {
    ...pipeline.stages,
    [stage]: value,
    completedAt: new Date()
  };

  await pipeline.save();

  res.json({
    success: true,
    message: `Pipeline stage ${stage} updated successfully`,
    data: {
      pipeline: {
        id: pipeline._id,
        type: pipeline.type,
        stages: pipeline.stages,
        metadata: pipeline.metadata
      }
    }
  });
}));

// @route   GET /api/pipelines/aptitude-questions
// @desc    Get aptitude questions for the test
// @access  Private
router.get('/aptitude-questions', asyncHandler(async (req, res) => {
  // Shuffle the questions to randomize order
  const shuffledQuestions = [...aptitudeQuestions].sort(() => Math.random() - 0.5);

  // Return first 25 questions (in case we have more than 25)
  const questions = shuffledQuestions.slice(0, 25).map(q => ({
    id: q.id,
    question: q.question,
    options: q.options
  }));

  res.json({
    success: true,
    data: {
      questions,
      totalQuestions: questions.length,
      timeLimit: 30 // minutes
    }
  });
}));

// @route   DELETE /api/pipelines/:id
// @desc    Delete pipeline (only if completed)
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!pipeline) {
    return res.status(404).json({
      success: false,
      error: 'Pipeline not found'
    });
  }

  // Only allow deletion if pipeline is completed
  if (!pipeline.stages?.tailoring_complete) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete incomplete pipeline'
    });
  }

  await Pipeline.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Pipeline deleted successfully'
  });
}));

export default router;

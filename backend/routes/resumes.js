import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import os from 'os';
import mammoth from 'mammoth';
import Resume from '../models/Resume.js';
import Interview from '../models/Interview.js';
import Pipeline from '../models/Pipeline.js';
import aiService from '../services/aiService.js';
import { requirePremium } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Dynamic import for pdf-parse to avoid test execution
let pdfParse = null;
const getPdfParser = async () => {
  if (!pdfParse) {
    const pdfModule = await import('pdf-parse');
    pdfParse = pdfModule.default;
  }
  return pdfParse;
};

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/resumes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// Removed the /upload route as per new requirement to work directly with resume text

router.post('/upload-text', asyncHandler(async (req, res) => {
  const { resumeText } = req.body;

  if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Please provide resume text in the request body as `resumeText`'
    });
  }

  // Optional size protection for very large texts
  const MAX_TEXT_SIZE = parseInt(process.env.MAX_TEXT_SIZE) || 2 * 1024 * 1024; // 2MB default (increased from 500KB)
  if (Buffer.byteLength(resumeText, 'utf8') > MAX_TEXT_SIZE) {
    return res.status(413).json({ success: false, error: 'Resume text too large' });
  }

  // Create resume record immediately so we always have an id to return
  console.log('Storing resume text, length:', resumeText.length);
  const resume = new Resume({
    user: req.user._id,
    status: 'uploaded',
    originalText: resumeText
  });
  // Set parsedData.fullText immediately to ensure full text is available for preview
  resume.parsedData = { fullText: resumeText };
  await resume.save();

  // Create pipeline (tailoring by default) for this upload so clients can update stages
  try {
    const pipeline = new Pipeline({
      user: req.user._id,
      type: 'tailoring',
      resume: resume._id,
      stages: { uploaded: true }
    });
    await pipeline.save();
  } catch (e) {
    console.warn('Failed to create pipeline entry for text upload:', e?.message || e);
  }

  // Kick off background processing with provided text (non-blocking)
  try {
    await processResumeInBackground(resume._id, resumeText);

    res.status(201).json({
      success: true,
      message: 'Resume text received successfully',
      data: {
        resumeId: resume._id.toString(),
        status: resume.status,
        message: 'Resume is being processed. You will be notified when analysis is complete.'
      }
    });
  } catch (error) {
    console.error('Processing resume text failed for resume', resume._id, error);
    resume.status = 'error';
    resume.processingErrors = resume.processingErrors || [];
    resume.processingErrors.push(error.message || 'Processing failed');
    await resume.save();

    res.status(201).json({
      success: true,
      message: 'Resume received but processing failed. It will be retried.',
      data: {
        resumeId: resume._id.toString(),
        status: resume.status,
        error: error.message
      }
    });
  }
}));

// @route   POST /api/resumes/preview
// @desc    Parse uploaded resume and return parsed text/summary for immediate preview (no DB record)
// @access  Private
router.post('/preview', upload.single('resume'), asyncHandler(async (req, res) => {
  // Accept either a file upload (field 'resume') or raw text in body as 'resumeText'
  if (!req.file && !(req.body && typeof req.body.resumeText === 'string')) {
    return res.status(400).json({
      success: false,
      error: "Please upload a resume file or provide resumeText in the request body"
    });
  }

  try {
    let resumeText = '';

    if (req.file) {
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfParser = await getPdfParser();
        const pdfData = await pdfParser(dataBuffer);
        resumeText = pdfData.text;
      } else if (req.file.mimetype.includes('word')) {
        const result = await mammoth.extractRawText({ path: req.file.path });
        resumeText = result.value;
      } else {
        // try to read as text
        try {
          resumeText = fs.readFileSync(req.file.path, 'utf8');
        } catch (e) {
          return res.status(400).json({ success: false, error: 'Unsupported file type for preview' });
        }
      }
    } else {
      // use provided plain text
      resumeText = req.body.resumeText || '';
    }

    const safeText = (resumeText || '').trim();
    const summary = safeText ? (safeText.substring(0, 200) + '...') : '';

    res.json({
      success: true,
      data: {
        parsedText: safeText,
        summary
      }
    });
  } catch (error) {
    console.error('Preview parsing failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Parsing failed' });
  } finally {
    // ensure uploaded file is removed from disk if present
    try {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (delErr) {
      console.warn('Failed to delete preview uploaded file:', delErr);
    }
  }
}));

// @route   GET /api/resumes
// @desc    Get user's resumes
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ user: req.user._id })
    .sort({ 'metadata.lastModified': -1 })
    .select('status metadata aiAnalysis.overallScore tailoredVersions');

  res.json({
    success: true,
    data: {
      resumes: resumes.map(resume => resume.getSummary())
    }
  });
}));

// @route   GET /api/resumes/:id
// @desc    Get specific resume details
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  console.log('Retrieving resume, originalText length:', resume.originalText?.length || 0);
  console.log('Retrieving resume, parsedData.fullText length:', resume.parsedData?.fullText?.length || 0);
  console.log('Retrieving resume, originalText exists:', !!resume.originalText);
  console.log('Retrieving resume, originalText first 100 chars:', resume.originalText?.substring(0, 100) || 'N/A');

  res.json({
    success: true,
    data: { resume }
  });
}));

// @route   POST /api/resumes/:id/analyze
// @desc    Analyze resume against job description
// @access  Private
router.post('/:id/analyze', asyncHandler(async (req, res) => {
  const { jobDescription } = req.body;

  if (!jobDescription) {
    return res.status(400).json({
      success: false,
      error: 'Job description is required'
    });
  }

  const resume = await Resume.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  if (resume.status !== 'parsed') {
    return res.status(400).json({
      success: false,
      error: 'Resume must be parsed before analysis'
    });
  }

  try {
    // Update status
    resume.status = 'analyzing';
    await resume.save();

    // Perform AI analysis
    const analysis = await aiService.analyzeResume(
      JSON.stringify(resume.parsedData),
      jobDescription
    );

    // Update resume with analysis results
    await resume.updateAIAnalysis(analysis);

    res.json({
      success: true,
      message: 'Resume analysis completed',
      data: {
        analysis,
        resumeId: resume._id
      }
    });
  } catch (error) {
    resume.status = 'error';
    resume.processingErrors.push(error.message);
    await resume.save();
    throw error;
  }
}));

// Enhanced /:id/tailor route to return match score, suggestions, optimized text, and LaTeX
router.post('/:id/tailor', asyncHandler(async (req, res) => {
  let { jobDescription, templateType = 'professional' } = req.body;
  if (!jobDescription || typeof jobDescription !== 'string') {
    jobDescription = 'General role tailoring';
  }

  const resume = await Resume.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  try {
    // Generate tailored content with match score and suggestions
    const sourceData = resume.parsedData || { fullText: '' };
    const tailoredContent = await aiService.tailorResume(
      sourceData,
      jobDescription,
      templateType
    );

    // Generate LaTeX content from tailored content
    const latexContent = await aiService.generateLaTeXResume(tailoredContent);

    // Create tailored version with all new fields
    const tailoredVersion = {
      jobDescription,
      tailoredContent,
      latexContent,
      matchScore: tailoredContent.matchScore,
      suggestions: tailoredContent.suggestions,
      optimizedText: tailoredContent.optimizedText,
      template: {
        name: templateType,
        category: templateType === 'premium' ? 'premium' : 'professional',
        isPremium: templateType === 'premium'
      }
    };

    await resume.addTailoredVersion(tailoredVersion);

    // Update pipeline stage
    try {
      await Pipeline.findOneAndUpdate(
        { user: req.user._id, resume: resume._id, type: 'tailoring' },
        { $set: { 'stages.tailored': true } },
        { new: true }
      );
    } catch (e) {
      console.warn('Failed to update pipeline stage tailored:', e?.message || e);
    }

    // Return comprehensive tailoring results
    res.json({
      success: true,
      message: 'Resume tailored successfully',
      data: {
        matchScore: tailoredContent.matchScore,
        suggestions: tailoredContent.suggestions,
        optimizedText: tailoredContent.optimizedText,
        latex: latexContent,
        tailoredContent,
        resumeId: resume._id
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   GET /api/resumes/:id/templates
// @desc    Get available resume templates
// @access  Private
router.get('/:id/templates', asyncHandler(async (req, res) => {
  const templates = [
    {
      id: 'professional',
      name: 'Professional',
      category: 'free',
      description: 'Clean and professional design suitable for most industries',
      preview: '/templates/professional-preview.png'
    },
    {
      id: 'modern',
      name: 'Modern',
      category: 'free',
      description: 'Contemporary design with clean typography',
      preview: '/templates/modern-preview.png'
    },
    {
      id: 'creative',
      name: 'Creative',
      category: 'premium',
      description: 'Unique design for creative industries',
      preview: '/templates/creative-preview.png'
    },
    {
      id: 'executive',
      name: 'Executive',
      category: 'premium',
      description: 'Sophisticated design for senior positions',
      preview: '/templates/executive-preview.png'
    }
  ];

  res.json({
    success: true,
    data: { templates }
  });
}));

// @route   POST /api/resumes/:id/generate-template
// @desc    Generate resume with specific template
// @access  Private
router.post('/:id/generate-template', requirePremium, asyncHandler(async (req, res) => {
  const { templateType, tailoredVersionId } = req.body;

  if (!templateType) {
    return res.status(400).json({
      success: false,
      error: 'Template type is required'
    });
  }

  const resume = await Resume.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  try {
    // Get tailored version content
    const tailoredVersion = resume.tailoredVersions.find(v => v._id.toString() === tailoredVersionId);
    if (!tailoredVersion) {
      return res.status(404).json({
        success: false,
        error: 'Tailored version not found'
      });
    }

    // Generate HTML template
    const htmlTemplate = await aiService.generateResumeTemplate(
      templateType,
      tailoredVersion.tailoredContent
    );

    res.json({
      success: true,
      message: 'Template generated successfully',
      data: {
        html: htmlTemplate,
        templateType
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/resumes/:id/download-template
// @desc    Generate and return a downloadable resume file (HTML) for a tailored version
// @access  Private
router.post('/:id/download-template', asyncHandler(async (req, res) => {
  const { tailoredVersionId, templateType = 'professional', as = 'html' } = req.body;

  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
  if (!resume) return res.status(404).json({ success: false, error: 'Resume not found' });

  const tailoredVersion = resume.tailoredVersions.find(v => v._id.toString() === tailoredVersionId);
  if (!tailoredVersion) return res.status(404).json({ success: false, error: 'Tailored version not found' });

  // Generate HTML
  const html = await aiService.generateResumeTemplate(templateType, tailoredVersion.tailoredContent);

  if (as === 'html') {
    // Return HTML as base64 so client can trigger download without storing server-side
    const base64 = Buffer.from(html, 'utf8').toString('base64');
    res.json({ success: true, data: { filename: `${templateType}-resume.html`, base64 } });
    return;
  }

  // For PDF conversion server-side is risky; return HTML and let client convert
  res.json({ success: true, data: { filename: `${templateType}-resume.html`, html } });
}));

// @route   POST /api/resumes/:id/generate-latex
// @desc    Generate LaTeX formatted resume for a tailored version
// @access  Private
router.post('/:id/generate-latex', asyncHandler(async (req, res) => {
  const { tailoredVersionId, content } = req.body;

  if (!tailoredVersionId && !content) {
    return res.status(400).json({
      success: false,
      error: 'Either tailored version ID or content is required'
    });
  }

  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
  if (!resume) return res.status(404).json({ success: false, error: 'Resume not found' });

  let contentToUse = content;
  if (!contentToUse && tailoredVersionId) {
    const tailoredVersion = resume.tailoredVersions.find(v => v._id.toString() === tailoredVersionId);
    if (!tailoredVersion) return res.status(404).json({ success: false, error: 'Tailored version not found' });
    contentToUse = tailoredVersion.tailoredContent;
  }

  try {
    // Generate LaTeX content using provided content or tailored version content
    const latexContent = await aiService.generateLaTeXResume(contentToUse);

    res.json({
      success: true,
      message: 'LaTeX resume generated successfully',
      data: {
        latex: latexContent,
        tailoredVersionId
      }
    });
  } catch (error) {
    console.error('LaTeX generation failed:', error);
    throw error;
  }
}));

// @route   POST /api/resumes/:id/compile-latex
// @desc    Compile LaTeX content to PDF and return base64 PDF
// @access  Private

router.post('/:id/compile-latex', asyncHandler(async (req, res) => {
  const { latexContent } = req.body;

  if (!latexContent || typeof latexContent !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'LaTeX content is required'
    });
  }

  // Create temp directory for compilation
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'latex-'));
  const texFile = path.join(tmpDir, 'resume.tex');
  const pdfFile = path.join(tmpDir, 'resume.pdf');

  try {
    // Write LaTeX content to file
    await fs.writeFile(texFile, latexContent, 'utf8');

    // Compile LaTeX to PDF using pdflatex
    await new Promise((resolve, reject) => {
      exec(`pdflatex -interaction=nonstopmode -output-directory=${tmpDir} ${texFile}`, (error, stdout, stderr) => {
        if (error) {
          console.error('pdflatex error:', stderr);
          reject(new Error('LaTeX compilation failed'));
        } else {
          resolve(stdout);
        }
      });
    });

    // Read compiled PDF and encode to base64
    const pdfData = await fs.readFile(pdfFile);
    const base64Pdf = pdfData.toString('base64');

    // Cleanup temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });

    res.json({
      success: true,
      message: 'PDF compiled successfully',
      data: {
        base64Pdf
      }
    });
  } catch (error) {
    // Cleanup temp directory on error
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.error('LaTeX compilation failed:', error);
    res.status(500).json({ success: false, error: error.message || 'Compilation failed' });
  }
}));

// @route   DELETE /api/resumes/:id
// @desc    Delete resume
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  // Delete associated files
  await Resume.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Resume deleted successfully'
  });
}));

router.post('/:id/parse-local', asyncHandler(async (req, res) => {
  const { parsedText, pipelineStage } = req.body;

  // Allow pipeline stage updates even when parsedText is not provided
  if (!parsedText && !pipelineStage) {
    return res.status(400).json({
      success: false,
      error: 'Either parsedText or pipelineStage is required in request body'
    });
  }

  const resume = await Resume.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({
      success: false,
      error: 'Resume not found'
    });
  }

  // Build a minimal parsedData structure similar to background parser
  const safeText = (parsedText || '').trim();

  // Save originalText as well for local parsed text
  if (safeText) {
    resume.originalText = safeText;
    const parsedData = {
      fullText: safeText,
      summary: safeText ? (safeText.substring(0, 200) + '...') : '',
      experience: [],
      education: [],
      skills: {
        technical: [],
        soft: []
      }
    };
    resume.parsedData = parsedData;
    resume.status = 'parsed';
    resume.processingErrors = resume.processingErrors || [];
    // clear previous parsing errors since we're providing a parsed payload
    resume.processingErrors = [];
    await resume.save();
  }

  // If a pipeline stage was included, update or create pipeline record
  if (pipelineStage) {
    try {
      let pipeline = await Pipeline.findOne({ user: req.user._id, resume: resume._id, type: 'tailoring' });
      if (!pipeline) {
        pipeline = new Pipeline({ user: req.user._id, resume: resume._id, type: 'tailoring', stages: {} });
      }
      pipeline.stages = { ...(pipeline.stages || {}), [pipelineStage]: true };
      pipeline.metadata = pipeline.metadata || {};
      pipeline.metadata.updatedAt = new Date();
      await pipeline.save();
      console.log(`Pipeline stage ${pipelineStage} updated for resume ${resume._id}`);
    } catch (e) {
      console.warn('Failed to update pipeline stage:', e?.message || e);
    }
  }

  res.json({
    success: true,
    message: 'Parsed data saved successfully',
    data: {
      resumeId: resume._id.toString(),
      status: resume.status
    }
  });
}));

  // Background processing function
  async function processResumeInBackground(resumeId, resumeText) {
    try {
      const resume = await Resume.findById(resumeId);
      if (!resume) return;

      // Update status
      resume.status = 'parsing';
      await resume.save();

      // TODO: Implement more sophisticated resume parsing
      // For now, create basic parsed data structure
      const safeText = (resumeText || '').trim();
      const parsedData = {
        fullText: safeText,
        summary: safeText ? safeText.substring(0, 200) + '...' : '',
        experience: [],
        education: [],
        skills: {
          technical: [],
          soft: []
        }
      };

      // Persist extracted text into parsedData.fullText and originalText so frontend and NLP pipelines can use it
      resume.parsedData = parsedData;
      resume.originalText = safeText;
      resume.status = 'parsed';
      await resume.save();

      console.log(`Resume ${resumeId} processed successfully`);

  // Run an automated pipeline for testing/demo purposes if enabled via env
      // - create a tailored version
      // - create interviews (technical, managerial, hr)
      // - simulate responses, evaluations and finish interviews
      // This makes the resume -> tailoring -> interviews -> analytics flow complete end-to-end.
      if (process.env.AUTOMATED_PIPELINE === 'true') {
        try {
          await runFullPipeline(resume);
        } catch (pipeErr) {
          console.warn('Automated pipeline failed for resume', resumeId, pipeErr?.message || pipeErr);
        }
      }
    } catch (error) {
      console.error(`Error processing resume ${resumeId}:`, error);
      
      const resume = await Resume.findById(resumeId);
      if (resume) {
        resume.status = 'error';
        resume.processingErrors.push(error.message);
        await resume.save();
      }
    }
  }

// Automated pipeline runner to exercise tailoring, interviews and analytics
async function runFullPipeline(resume) {
  if (!resume) return;

  const resumeId = resume._id;
  const userId = resume.user;

  // 1) Create a tailored version using AI service (or heuristic fallback)
  try {
    const jobDescription = 'Auto-generated generic role for pipeline testing';
    const templateType = 'professional';
    const tailoredContent = await aiService.tailorResume(resume.parsedData || { fullText: resume.parsedData?.fullText || '' }, jobDescription, templateType);

    const tailoredVersion = {
      jobDescription,
      tailoredContent,
      template: {
        name: templateType,
        category: templateType === 'premium' ? 'premium' : 'professional',
        isPremium: templateType === 'premium'
      }
    };

    await resume.addTailoredVersion(tailoredVersion);

    // Update pipeline: tailored
    try {
      await Pipeline.findOneAndUpdate(
        { user: userId, resume: resumeId, type: 'tailoring' },
        { $set: { 'stages.tailored': true } },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('Failed to update pipeline stage tailored in automated runner:', e?.message || e);
    }
  } catch (err) {
    console.warn('Tailoring step failed in automated pipeline:', err?.message || err);
  }

  // 2) Create interviews for each type and simulate a full session
  const interviewTypes = ['technical', 'managerial', 'hr'];
  for (const type of interviewTypes) {
    try {
      const questions = await aiService.generateInterviewQuestions(
        resume.parsedData || { fullText: resume.parsedData?.fullText || '' },
        `Auto job description for ${type}`,
        type,
        5
      );

      // Ensure questions is an array (AI fallback returns array)
      const qs = Array.isArray(questions) ? questions : (questions.questions || []);

      const interview = new Interview({
        user: userId,
        resume: resumeId,
        jobDescription: { title: `Auto ${type} interview`, description: `Auto-generated ${type} interview` },
        interviewType: type,
        questions: qs.map(q => ({
          question: q.question || q,
          category: q.category || type,
          difficulty: q.difficulty || 'medium',
          expectedKeywords: q.expectedKeywords || (q.expectedKeywords || []),
          modelAnswer: q.modelAnswer || 'Model answer placeholder'
        })),
        settings: {
          questionCount: qs.length,
          timeLimit: 15,
          allowReplay: false,
          showTimer: false
        },
        session: {
          totalQuestions: qs.length,
          completedQuestions: 0
        }
      });

      await interview.save();

      // Mark interview stage on pipeline
      try {
        await Pipeline.findOneAndUpdate(
          { user: userId, resume: resumeId, type: 'tailoring' },
          { $set: { 'stages.interview': true } },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('Failed to update pipeline stage interview in automated runner:', e?.message || e);
      }

      // Simulate answering each question and evaluating
      for (let i = 0; i < interview.questions.length; i++) {
        const q = interview.questions[i];
        const simulatedResponse = `This is an automated test response covering ${ (q.expectedKeywords || []).slice(0,3).join(', ') } and describing accomplishments.`;
        const evaluation = await aiService.evaluateResponse(q.question, simulatedResponse, q.modelAnswer || '', q.expectedKeywords || []);
        const nonVerbal = await aiService.analyzeNonVerbalCues({ simulated: true });

        await interview.addQuestionResponse(i, { text: simulatedResponse }, evaluation, nonVerbal);
      }

      // Start and end session
      await interview.startSession();
      await interview.endSession();
      await interview.calculatePerformance();

      // Mark analytics stage
      try {
        await Pipeline.findOneAndUpdate(
          { user: userId, resume: resumeId, type: 'tailoring' },
          { $set: { 'stages.analytics': true } },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('Failed to update pipeline stage analytics in automated runner:', e?.message || e);
      }
    } catch (err) {
      console.warn(`Automated interview (${type}) failed:`, err?.message || err);
    }
  }
}

export default router;

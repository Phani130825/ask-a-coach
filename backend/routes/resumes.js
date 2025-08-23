import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import Resume from '../models/Resume.js';
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

// @route   POST /api/resumes/upload
// @desc    Upload and parse resume
// @access  Private
router.post('/upload', upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload a resume file'
    });
  }

  // Create resume record immediately so we always have an id to return
  const resume = new Resume({
    user: req.user._id,
    originalFile: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/resumes/${req.file.filename}`
    },
    status: 'uploaded'
  });

  await resume.save();

  // Attempt parsing but do not fail the request if parsing errors occur
  try {
    let resumeText = '';

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfParser = await getPdfParser();
      const pdfData = await pdfParser(dataBuffer);
      resumeText = pdfData.text;
    } else if (req.file.mimetype.includes('word')) {
      const result = await mammoth.extractRawText({ path: req.file.path });
      resumeText = result.value;
    }

    // Kick off background processing with parsed text (may be empty)
    processResumeInBackground(resume._id, resumeText);

    res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeId: resume._id,
        status: resume.status,
        message: 'Resume is being processed. You will be notified when analysis is complete.'
      }
    });
  } catch (error) {
    // Log parsing error and mark resume for manual processing, but return success response
    console.error('Resume parsing failed for file', req.file.path, error);
    resume.status = 'error';
    resume.processingErrors = resume.processingErrors || [];
    resume.processingErrors.push(error.message || 'Parsing failed');
    await resume.save();

    res.status(201).json({
      success: true,
      message: 'Resume uploaded but parsing failed. It will be retried.',
      data: {
        resumeId: resume._id,
        status: resume.status,
        error: error.message
      }
    });
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

// @route   POST /api/resumes/:id/tailor
// @desc    Create tailored resume version
// @access  Private
router.post('/:id/tailor', asyncHandler(async (req, res) => {
  const { jobDescription, templateType = 'professional' } = req.body;

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

  if (resume.status !== 'analyzed') {
    return res.status(400).json({
      success: false,
      error: 'Resume must be analyzed before tailoring'
    });
  }

  try {
    // Generate tailored content
    const tailoredContent = await aiService.tailorResume(
      resume.parsedData,
      jobDescription,
      templateType
    );

    // Create tailored version
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

    res.json({
      success: true,
      message: 'Resume tailored successfully',
      data: {
        tailoredVersion,
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
  if (resume.originalFile && fs.existsSync(resume.originalFile.filename)) {
    fs.unlinkSync(resume.originalFile.filename);
  }

  await Resume.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Resume deleted successfully'
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
    const parsedData = {
      summary: resumeText.substring(0, 200) + '...',
      experience: [],
      education: [],
      skills: {
        technical: [],
        soft: []
      }
    };

    resume.parsedData = parsedData;
    resume.status = 'parsed';
    await resume.save();

    console.log(`Resume ${resumeId} processed successfully`);
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

export default router;

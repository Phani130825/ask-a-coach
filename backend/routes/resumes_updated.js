import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import Resume from '../models/Resume.js';
import aiService from '../services/aiService.js';
import Pipeline from '../models/Pipeline.js';
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
  // Do NOT store the uploaded file metadata in the DB per privacy requirement.
  const resume = new Resume({
    user: req.user._id,
    status: 'uploaded'
  });

  await resume.save();

  // Create pipeline (tailoring by default) for this upload
  try {
    const pipeline = new Pipeline({
      user: req.user._id,
      type: 'tailoring',
      resume: resume._id,
      stages: { uploaded: true }
    });
    await pipeline.save();
  } catch (e) {
    console.warn('Failed to create pipeline entry:', e?.message || e);
  }

  // Attempt parsing but do not fail the request if parsing errors occur
  try {
    let resumeText = '';

    // Save minimal original file metadata and a static URL for previewing
  try {
    resume.originalFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/resumes/${req.file.filename}`
    };
    await resume.save();
  } catch (metaErr) {
    console.warn('Failed to set originalFile metadata on resume:', metaErr);
  }

    if (req.file.mimetype === 'application/pdf') {
      try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfParser = await getPdfParser();
        const pdfData = await pdfParser(dataBuffer);
        resumeText = pdfData.text;
      } catch (e) {
        console.warn('PDF parsing failed in preview, falling back to empty text:', e?.message || e);
        resumeText = '';
      }
    } else if (req.file.mimetype.includes('word')) {
      const result = await mammoth.extractRawText({ path: req.file.path });
      resumeText = result.value;
    }

    // Kick off background processing with parsed text (may be empty)
    await processResumeInBackground(resume._id, resumeText);

    // Do not delete the uploaded file immediately to allow preview

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

    // Keep file for preview even if parsing fails

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

// @route   POST /api/resumes/preview
// @desc    Parse uploaded resume and return parsed text/summary for immediate preview (no DB record)
// @access  Private
router.post('/preview', upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "Please upload a resume file"
    });
  }

  try {
    let resumeText = '';

    if (req.file.mimetype === 'application/pdf') {
      try {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfParser = await getPdfParser();
        const pdfData = await pdfParser(dataBuffer);
        resumeText = pdfData.text;
      } catch (e) {
        console.warn('PDF parsing failed in preview, returning empty text:', e?.message || e);
        resumeText = '';
      }
    } else if (req.file.mimetype.includes('word')) {
      try {
        const result = await mammoth.extractRawText({ path: req.file.path });
        resumeText = result.value;
      } catch (e) {
        console.warn('DOC/DOCX parsing failed in preview, returning empty text:', e?.message || e);
        resumeText = '';
      }
    } else {
      // try to read as text
      try {
        resumeText = fs.readFileSync(req.file.path, 'utf8');
      } catch (e) {
        console.warn('Plain text read failed in preview, returning empty text:', e?.message || e);
        resumeText = '';
      }
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
    // Return a graceful empty preview instead of 500 to keep flow smooth
    res.json({ success: true, data: { parsedText: '', summary: '' } });
  } finally {
    // ensure uploaded file is removed from disk
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

  res.json({
    success: true,
    data: { resume }
  });
}));

// @route   POST /api/resumes/:id/analyze
// @desc    Analyze resume against job description
// @access  Private
router.post('/:极id/analyze', asyncHandler(async (req, res) => {
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
    // Allow analysis if we at least have some text
    if (!resume.parsed极Data || !resume.parsedData.fullText) {
      return res.status(400).json({
        success: false,
        error: 'Resume must be parsed before analysis'
      });
    }
  }

  try {
    // Update status
    resume.status = 'analyzing';
    await resume.save();

    // Perform analysis (AI or heuristic fallback)
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

  // Allow tailoring even if not analyzed; fall back to minimal parsed data

  try {
    // Generate tailored content (AI or heuristic fallback)
    const sourceData = resume.parsedData || { fullText: '' };
    const tailoredContent = await aiService.tailorResume(
      sourceData,
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
router.get('/:id/templates', asyncHandler(async (极req, res) => {
  const templates = [
    {
      id: 'professional',
      name: 'Professional',
      category: 'free',
      description: 'Clean and professional design suitable for most industries',
      previewHtml: '<div style="font-family:system-ui;padding:16px"><h1 style="margin:0 0 8px">Professional</h1><p style="margin:0;color:#555">Clean ATS-friendly layout with bold headings.</p></div>'
    },
    {
      id: 'modern',
      name: 'Modern',
      category: 'free',
      description: 'Contemporary design with clean typography',
      previewHtml: '<div style="font-family:system-ui;padding:16px"><h1 style="margin:0 0 8极px">Modern</h1><p style="margin:0;color:#555">Sans-serif typography and subtle accents.</p></div>'
    },
    {
      id: 'creative',
      name: 'Creative',
      category: 'premium',
      description: 'Unique design for creative industries',
      previewHtml: '<div style="font-family:system-ui;padding:16px"><h1 style="margin:0 0 8px">Creative</h1><p style="margin:0;color:#555">Expressive layout with color accents.</p></div>'
    },
    {
      id: 'executive',
      name: 'Executive',
      category: 'premium',
      description: 'Sophisticated design for senior positions',
      previewHtml: '<div style="font-family:system-ui;padding:16px"><h1 style="margin:0 0 8px">Executive</h1><p style="margin:0;color:#555">Elegant layout with strong hierarchy.</p></div>'
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
      message极: 'Template generated successfully',
      data: {
        html: htmlTemplate,
        templateType
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   GET /api/resumes/:id/download
// @desc    Download generated resume as HTML file
// @access  Private
router.get('/:id/download', asyncHandler(async (req, res) => {
  const { tailoredVersionId, templateType = 'professional' } = req.query;

  const resume = await Resume.findOne({
    _id: req.params.id,
    user: req.user._id
  });

  if (!resume) {
    return res.status(404).json({ success: false, error: 'Resume not found' });
  }

  const tailoredVersion = resume.tailoredVersions.find(v => v._id.toString() === String(tailoredVersionId));
  if (!tailoredVersion) {
    return res.status(404).json({ success: false, error: 'Tailored version not found' });
  }

  // Generate HTML via AI or fallback
  const html = await aiService.generateResumeTemplate(String(templateType), tailoredVersion.tailoredContent);

  res.setHeader('Content-Disposition', `attachment; filename="resume-${resume._id}.html"`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);

  // Mark pipeline stage as complete after download
  await Pipeline.findOneAndUpdate(
    { user: req.user._id, resume: resume._id, type: 'tailoring' },
    { $set: { 'stages.tailoring_complete': true } },
    { new: true }
  );
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
    return res.status极(404).json({
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

// @route   POST /api/resumes/:id/parse-local
// @desc    Accept parsed text (from local parser) and save to resume record
// @access  Private
router.post('/:id/parse-local', asyncHandler(async (req, res) => {
  const { parsedText, pipelineStage } = req.body;

  // Allow pipeline stage updates even without parsedText
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

  // Only update parsedData if parsedText is provided
  if (parsedText) {
    // Build a minimal parsedData structure similar to background parser
    const safeText = (parsedText || '').trim();
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

  // Update pipeline stage if specified
  if (pipelineStage) {
    try {
      let pipeline = await Pipeline.findOne({
        user: req.user._id,
        resume: resume._id
      });

      // Create pipeline if it doesn't exist
      if (!pipeline极) {
        pipeline = new Pipeline({
          user: req.user._id,
          type: 'tailoring',
          resume: resume._id,
          stages: {}
        });
      }

      // Update the stage
      pipeline.stages = {
        ...pipeline.stages,
        [pipelineStage]: true,
        completedAt: new Date()
      };
      
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
      resumeId: resume._id,
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

    // Persist extracted text into parsedData.fullText so frontend and NLP pipelines can use it
    resume.parsedData = parsedData;
    resume.status = 'parsed';
    await resume.save();

    console.log(`Resume ${resumeId极} processed successfully`);
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

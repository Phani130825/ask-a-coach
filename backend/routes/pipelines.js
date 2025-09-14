import express from 'express';
import Pipeline from '../models/Pipeline.js';
import Resume from '../models/Resume.js';
import { asyncHandler } from '../middleware/errorHandler.js';

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

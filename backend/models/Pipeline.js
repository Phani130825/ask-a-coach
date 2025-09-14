import mongoose from 'mongoose';

const pipelineSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['tailoring', 'interview'], required: true },
  resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
  stages: { type: Object, default: {} },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

pipelineSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

pipelineSchema.methods.updateStage = function(stage, value = true) {
  this.stages = { ...(this.stages || {}), [stage]: value };
  this.metadata.updatedAt = new Date();
  return this.save();
};

pipelineSchema.index({ user: 1, type: 1, 'metadata.updatedAt': -1 });

const Pipeline = mongoose.model('Pipeline', pipelineSchema);

export default Pipeline;




import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFile: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  },
  originalText: {
    type: String,
    default: ''
  },
  parsedData: {
    fullText: {
      type: String,
      default: ''
    },
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      website: String
    },
    summary: String,
    experience: [{
      title: String,
      company: String,
      location: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      description: [String],
      skills: [String],
      achievements: [String]
    }],
    education: [{
      degree: String,
      institution: String,
      field: String,
      graduationYear: Number,
      gpa: String,
      honors: [String]
    }],
    skills: {
      technical: [String],
      soft: [String],
      languages: [String],
      certifications: [String]
    },
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String,
      startDate: Date,
      endDate: Date
    }],
    achievements: [String],
    volunteerWork: [{
      organization: String,
      role: String,
      description: String,
      startDate: Date,
      endDate: Date
    }]
  },
  aiAnalysis: {
    skillsMatch: {
      matchedSkills: [String],
      missingSkills: [String],
      skillGaps: [{
        skill: String,
        importance: String,
        suggestion: String
      }]
    },
    experienceRelevance: {
      relevantExperience: [String],
      suggestedImprovements: [String],
      keywordOptimization: [String]
    },
    overallScore: {
      atsCompatibility: Number,
      contentQuality: Number,
      skillAlignment: Number,
      totalScore: Number
    },
    suggestions: [String],
    lastAnalyzed: Date
  },
  tailoredVersions: [{
    jobTitle: String,
    company: String,
    jobDescription: String,
    tailoredContent: {
      summary: String,
      experience: [{
        title: String,
        company: String,
        description: [String],
        relevance: Number
      }],
      skills: [String],
      keywords: [String]
    },
    template: {
      name: String,
      category: String,
      isPremium: Boolean
    },
    matchScore: Number,
    suggestions: [String],
    optimizedText: String,
    latexContent: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['uploaded', 'parsing', 'parsed', 'analyzing', 'analyzed', 'error'],
    default: 'uploaded'
  },
  processingErrors: [String],
  metadata: {
    uploadDate: {
      type: Date,
      default: Date.now
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
resumeSchema.index({ user: 1, 'metadata.lastModified': -1 });
resumeSchema.index({ status: 1 });
resumeSchema.index({ 'aiAnalysis.overallScore.totalScore': -1 });

// Method to get latest tailored version
resumeSchema.methods.getLatestTailoredVersion = function() {
  if (this.tailoredVersions.length === 0) return null;
  return this.tailoredVersions[this.tailoredVersions.length - 1];
};

// Method to add tailored version
resumeSchema.methods.addTailoredVersion = function(tailoredData) {
  this.tailoredVersions.push(tailoredData);
  this.metadata.lastModified = new Date();
  this.metadata.version += 1;
  return this.save();
};

// Method to update AI analysis
resumeSchema.methods.updateAIAnalysis = function(analysisData) {
  this.aiAnalysis = { ...this.aiAnalysis, ...analysisData, lastAnalyzed: new Date() };
  this.status = 'analyzed';
  this.metadata.lastModified = new Date();
  return this.save();
};

// Method to get resume summary for dashboard
resumeSchema.methods.getSummary = function() {
  return {
    id: this._id,
    status: this.status,
    lastModified: this.metadata.lastModified,
    overallScore: this.aiAnalysis?.overallScore?.totalScore || 0,
    tailoredVersions: this.tailoredVersions.length,
    hasAnalysis: !!this.aiAnalysis?.lastAnalyzed
  };
};

// Pre-save middleware to update lastModified
resumeSchema.pre('save', function(next) {
  this.metadata.lastModified = new Date();
  next();
});

const Resume = mongoose.model('Resume', resumeSchema);

export default Resume;

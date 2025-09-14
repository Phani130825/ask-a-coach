import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  jobDescription: {
    title: String,
    company: String,
    description: String,
    requiredSkills: [String],
    responsibilities: [String],
    requirements: [String]
  },
  interviewType: {
    type: String,
    enum: ['hr', 'managerial', 'technical'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  session: {
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    totalQuestions: Number,
    completedQuestions: Number
  },
  questions: [{
    question: String,
    category: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    expectedKeywords: [String],
    modelAnswer: String,
    // Only store text transcripts and lightweight metadata. Do NOT persist raw audio/video URLs.
    userResponse: {
      text: String,
      duration: Number,
      confidence: Number
    },
    evaluation: {
      contentScore: Number,
      keywordMatch: Number,
      clarity: Number,
      relevance: Number,
      overallScore: Number,
      feedback: String,
      suggestions: [String],
      aiFeedback: String
    },
    nonVerbalAnalysis: {
      eyeContact: Number,
      posture: Number,
      gestures: Number,
      facialExpressions: Number,
      confidence: Number,
      overallScore: Number,
      feedback: String
    },
    timestamp: Date
  }],
  performance: {
    overallScore: Number,
    contentScore: Number,
    nonVerbalScore: Number,
    strengths: [String],
    weaknesses: [String],
    improvementAreas: [String],
    totalPoints: Number,
    bonusPoints: Number
  },
  recording: {
    videoUrl: String,
    audioUrl: String,
    thumbnailUrl: String,
    duration: Number,
    fileSize: Number
  },
  settings: {
    questionCount: {
      type: Number,
      default: 10
    },
    timeLimit: {
      type: Number,
      default: 30 // minutes
    },
    allowReplay: {
      type: Boolean,
      default: true
    },
    showTimer: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    createdAt: {
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
interviewSchema.index({ user: 1, 'metadata.createdAt': -1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ interviewType: 1 });
interviewSchema.index({ 'performance.overallScore': -1 });

// Method to start interview session
interviewSchema.methods.startSession = function() {
  this.status = 'in-progress';
  this.session.startTime = new Date();
  this.metadata.lastModified = new Date();
  return this.save();
};

// Method to end interview session
interviewSchema.methods.endSession = function() {
  this.status = 'completed';
  this.session.endTime = new Date();
  this.session.duration = Math.round((this.session.endTime - this.session.startTime) / (1000 * 60));
  this.metadata.lastModified = new Date();
  return this.save();
};

// Method to add question response
interviewSchema.methods.addQuestionResponse = function(questionIndex, response, evaluation, nonVerbalAnalysis) {
  if (this.questions[questionIndex]) {
    // Ensure we only persist textual transcript and a couple small metadata fields.
    const safeResponse = {};
    if (response) {
      safeResponse.text = typeof response === 'string' ? response : (response.text || '');
      if (response.duration) safeResponse.duration = response.duration;
      if (response.confidence) safeResponse.confidence = response.confidence;
    }

    this.questions[questionIndex].userResponse = safeResponse;
    this.questions[questionIndex].evaluation = evaluation;
    this.questions[questionIndex].nonVerbalAnalysis = nonVerbalAnalysis;
    this.questions[questionIndex].timestamp = new Date();
    this.session.completedQuestions = (this.session.completedQuestions || 0) + 1;
    this.metadata.lastModified = new Date();
  }
  return this.save();
};

// Method to calculate overall performance
interviewSchema.methods.calculatePerformance = function() {
  if (this.questions.length === 0) return this;
  
  let totalContentScore = 0;
  let totalNonVerbalScore = 0;
  let totalPoints = 0;
  let bonusPoints = 0;
  const strengths = [];
  const weaknesses = [];
  const improvementAreas = [];
  
  this.questions.forEach(question => {
    if (question.evaluation) {
      totalContentScore += question.evaluation.overallScore || 0;
      totalPoints += question.evaluation.overallScore || 0;
    }
    
    if (question.nonVerbalAnalysis) {
      totalNonVerbalScore += question.nonVerbalAnalysis.overallScore || 0;
      totalPoints += question.nonVerbalAnalysis.overallScore || 0;
      
      // Bonus points for good non-verbal cues
      if (question.nonVerbalAnalysis.confidence > 7) {
        bonusPoints += 2;
      }
    }
    
    // Identify strengths and weaknesses
    if (question.evaluation?.overallScore > 8) {
      strengths.push(`Strong answer to: ${question.question.substring(0, 50)}...`);
    } else if (question.evaluation?.overallScore < 6) {
      weaknesses.push(`Needs improvement: ${question.question.substring(0, 50)}...`);
      if (question.evaluation?.feedback) {
        improvementAreas.push(question.evaluation.feedback);
      }
    }
  });
  
  this.performance = {
    overallScore: Math.round((totalContentScore + totalNonVerbalScore) / (this.questions.length * 2) * 10) / 10,
    contentScore: Math.round(totalContentScore / this.questions.length * 10) / 10,
    nonVerbalScore: Math.round(totalNonVerbalScore / this.questions.length * 10) / 10,
    strengths: strengths.slice(0, 5), // Top 5 strengths
    weaknesses: weaknesses.slice(0, 5), // Top 5 weaknesses
    improvementAreas: [...new Set(improvementAreas)].slice(0, 5), // Unique improvement areas
    totalPoints,
    bonusPoints
  };
  
  return this.save();
};

// Method to get interview summary
interviewSchema.methods.getSummary = function() {
  return {
    id: this._id,
    interviewType: this.interviewType,
    status: this.status,
    startTime: this.session.startTime,
    duration: this.session.duration,
    totalQuestions: this.session.totalQuestions,
    completedQuestions: this.session.completedQuestions,
    overallScore: this.performance?.overallScore || 0,
    totalPoints: this.performance?.totalPoints || 0,
    bonusPoints: this.performance?.bonusPoints || 0
  };
};

// Pre-save middleware to update lastModified
interviewSchema.pre('save', function(next) {
  this.metadata.lastModified = new Date();
  next();
});

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;

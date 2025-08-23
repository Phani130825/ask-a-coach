import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  profilePicture: {
    type: String,
    default: null
  },
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  preferences: {
    interviewTypes: [{
      type: String,
      enum: ['hr', 'managerial', 'technical']
    }],
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    privacy: {
      shareAnalytics: { type: Boolean, default: false },
      publicProfile: { type: Boolean, default: false }
    }
  },
  stats: {
    totalInterviews: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    totalPracticeTime: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ subscription: 1 });
userSchema.index({ 'stats.lastActive': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add validation error logging
userSchema.pre('save', function(next) {
  console.log('User model validation - saving user:', {
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    hasPassword: !!this.password
  });
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.verificationToken;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  return userObject;
};

// Method to update stats
userSchema.methods.updateStats = function(interviewScore, practiceTime) {
  this.stats.totalInterviews += 1;
  this.stats.totalPracticeTime += practiceTime || 0;
  
  // Update average score
  const currentTotal = this.stats.averageScore * (this.stats.totalInterviews - 1);
  this.stats.averageScore = (currentTotal + interviewScore) / this.stats.totalInterviews;
  
  this.stats.lastActive = new Date();
  return this.save();
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;

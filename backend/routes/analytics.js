import express from 'express';
import Interview from '../models/Interview.js';
import Resume from '../models/Resume.js';
import User from '../models/User.js';
import aiService from '../services/aiService.js';
import { requirePremium } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get user dashboard analytics
// @access  Private
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get basic stats
  const totalInterviews = await Interview.countDocuments({ user: userId });
  const completedInterviews = await Interview.countDocuments({ 
    user: userId, 
    status: 'completed' 
  });
  const totalResumes = await Resume.countDocuments({ user: userId });
  const analyzedResumes = await Resume.countDocuments({ 
    user: userId, 
    status: 'analyzed' 
  });

  // Get performance metrics
  const interviews = await Interview.find({ 
    user: userId, 
    status: 'completed' 
  }).select('performance interviewType session metadata');

  const performanceMetrics = {
    overall: {
      averageScore: 0,
      totalPoints: 0,
      totalBonus: 0,
      improvement: 0
    },
    byType: {
      hr: { count: 0, averageScore: 0 },
      managerial: { count: 0, averageScore: 0 },
      technical: { count: 0, averageScore: 0 }
    },
    trends: []
  };

  if (interviews.length > 0) {
    let totalScore = 0;
    let totalPoints = 0;
    let totalBonus = 0;

    interviews.forEach(interview => {
      const score = interview.performance?.overallScore || 0;
      const points = interview.performance?.totalPoints || 0;
      const bonus = interview.performance?.bonusPoints || 0;

      totalScore += score;
      totalPoints += points;
      totalBonus += bonus;

      // By type
      const type = interview.interviewType;
      if (performanceMetrics.byType[type]) {
        performanceMetrics.byType[type].count++;
        performanceMetrics.byType[type].averageScore += score;
      }
    });

    performanceMetrics.overall.averageScore = Math.round((totalScore / interviews.length) * 10) / 10;
    performanceMetrics.overall.totalPoints = totalPoints;
    performanceMetrics.overall.totalBonus = totalBonus;

    // Calculate averages by type
    Object.keys(performanceMetrics.byType).forEach(type => {
      if (performanceMetrics.byType[type].count > 0) {
        performanceMetrics.byType[type].averageScore = Math.round(
          (performanceMetrics.byType[type].averageScore / performanceMetrics.byType[type].count) * 10
        ) / 10;
      }
    });

    // Calculate improvement trend (last 5 interviews)
    const recentInterviews = interviews
      .sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt))
      .slice(0, 5);

    if (recentInterviews.length >= 2) {
      const recentAvg = recentInterviews
        .slice(0, Math.ceil(recentInterviews.length / 2))
        .reduce((sum, i) => sum + (i.performance?.overallScore || 0), 0) / Math.ceil(recentInterviews.length / 2);
      
      const olderAvg = recentInterviews
        .slice(Math.ceil(recentInterviews.length / 2))
        .reduce((sum, i) => sum + (i.performance?.overallScore || 0), 0) / (recentInterviews.length - Math.ceil(recentInterviews.length / 2));

      performanceMetrics.overall.improvement = Math.round((recentAvg - olderAvg) * 10) / 10;
    }
  }

  // Get recent activity
  const recentActivity = await Interview.find({ user: userId })
    .sort({ 'metadata.createdAt': -1 })
    .limit(5)
    .select('interviewType status performance metadata')
    .populate('resume', 'originalFile.originalName');

  res.json({
    success: true,
    data: {
      overview: {
        totalInterviews,
        completedInterviews,
        totalResumes,
        analyzedResumes,
        completionRate: totalInterviews > 0 ? Math.round((completedInterviews / totalInterviews) * 100) : 0
      },
      performance: performanceMetrics,
      recentActivity: recentActivity.map(interview => ({
        id: interview._id,
        type: interview.interviewType,
        status: interview.status,
        score: interview.performance?.overallScore || 0,
        date: interview.metadata.createdAt,
        resumeName: interview.resume?.originalFile?.originalName || 'Unknown'
      }))
    }
  });
}));

// @route   GET /api/analytics/performance
// @desc    Get detailed performance analytics
// @access  Private
router.get('/performance', asyncHandler(async (req, res) => {
  const { period = '30d', type, limit = 20 } = req.query;
  const userId = req.user._id;

  // Calculate date range
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  // Build query
  const query = {
    user: userId,
    status: 'completed',
    'metadata.createdAt': { $gte: startDate }
  };

  if (type && ['hr', 'managerial', 'technical'].includes(type)) {
    query.interviewType = type;
  }

  const interviews = await Interview.find(query)
    .sort({ 'metadata.createdAt': -1 })
    .limit(parseInt(limit))
    .select('performance interviewType session metadata questions');

  // Calculate detailed metrics
  const metrics = {
    totalInterviews: interviews.length,
    averageScores: {
      overall: 0,
      content: 0,
      nonVerbal: 0
    },
    scoreDistribution: {
      excellent: 0, // 9-10
      good: 0,      // 7-8.9
      average: 0,   // 5-6.9
      below: 0      // <5
    },
    questionAnalysis: {
      totalQuestions: 0,
      averageResponseTime: 0,
      strengths: [],
      weaknesses: []
    },
    improvementAreas: []
  };

  if (interviews.length > 0) {
    let totalOverall = 0;
    let totalContent = 0;
    let totalNonVerbal = 0;
    let totalQuestions = 0;
    let totalResponseTime = 0;
    const allStrengths = [];
    const allWeaknesses = [];
    const allImprovementAreas = [];

    interviews.forEach(interview => {
      const overall = interview.performance?.overallScore || 0;
      const content = interview.performance?.contentScore || 0;
      const nonVerbal = interview.performance?.nonVerbalScore || 0;

      totalOverall += overall;
      totalContent += content;
      totalNonVerbal += nonVerbal;

      // Score distribution
      if (overall >= 9) metrics.scoreDistribution.excellent++;
      else if (overall >= 7) metrics.scoreDistribution.good++;
      else if (overall >= 5) metrics.scoreDistribution.average++;
      else metrics.scoreDistribution.below++;

      // Question analysis
      interview.questions.forEach(question => {
        if (question.evaluation) {
          totalQuestions++;
          
          if (question.evaluation.overallScore > 8) {
            allStrengths.push(question.question.substring(0, 50) + '...');
          } else if (question.evaluation.overallScore < 6) {
            allWeaknesses.push(question.question.substring(0, 50) + '...');
          }

          if (question.evaluation.feedback) {
            allImprovementAreas.push(question.evaluation.feedback);
          }
        }
      });

      // Response time (if available)
      if (interview.session.duration) {
        totalResponseTime += interview.session.duration;
      }
    });

    metrics.averageScores.overall = Math.round((totalOverall / interviews.length) * 10) / 10;
    metrics.averageScores.content = Math.round((totalContent / interviews.length) * 10) / 10;
    metrics.averageScores.nonVerbal = Math.round((totalNonVerbal / interviews.length) * 10) / 10;

    metrics.questionAnalysis.totalQuestions = totalQuestions;
    metrics.questionAnalysis.averageResponseTime = totalQuestions > 0 ? 
      Math.round(totalResponseTime / interviews.length) : 0;

    // Get top strengths and weaknesses
    metrics.questionAnalysis.strengths = [...new Set(allStrengths)].slice(0, 5);
    metrics.questionAnalysis.weaknesses = [...new Set(allWeaknesses)].slice(0, 5);
    metrics.improvementAreas = [...new Set(allImprovementAreas)].slice(0, 10);
  }

  res.json({
    success: true,
    data: { metrics }
  });
}));

// @route   GET /api/analytics/resume-insights
// @desc    Get resume performance insights
// @access  Private
router.get('/resume-insights', asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const resumes = await Resume.find({ 
    user: userId, 
    status: 'analyzed' 
  }).select('aiAnalysis tailoredVersions metadata');

  const insights = {
    totalResumes: resumes.length,
    averageScore: 0,
    topSkills: [],
    skillGaps: [],
    improvementSuggestions: [],
    templateUsage: {
      professional: 0,
      premium: 0
    }
  };

  if (resumes.length > 0) {
    let totalScore = 0;
    const allSkills = [];
    const allSkillGaps = [];
    const allSuggestions = [];

    resumes.forEach(resume => {
      const score = resume.aiAnalysis?.overallScore?.totalScore || 0;
      totalScore += score;

      // Collect skills and gaps
      if (resume.aiAnalysis?.skillsMatch) {
        allSkills.push(...(resume.aiAnalysis.skillsMatch.matchedSkills || []));
        resume.aiAnalysis.skillsMatch.skillGaps?.forEach(gap => {
          allSkillGaps.push({
            skill: gap.skill,
            importance: gap.importance,
            suggestion: gap.suggestion
          });
        });
      }

      // Collect suggestions
      if (resume.aiAnalysis?.suggestions) {
        allSuggestions.push(...resume.aiAnalysis.suggestions);
      }

      // Template usage
      resume.tailoredVersions?.forEach(version => {
        if (version.template?.isPremium) {
          insights.templateUsage.premium++;
        } else {
          insights.templateUsage.professional++;
        }
      });
    });

    insights.averageScore = Math.round((totalScore / resumes.length) * 10) / 10;

    // Get top skills (most frequent)
    const skillCounts = {};
    allSkills.forEach(skill => {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });

    insights.topSkills = Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    // Get top skill gaps
    insights.skillGaps = allSkillGaps
      .sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        return importanceOrder[b.importance] - importanceOrder[a.importance];
      })
      .slice(0, 10);

    // Get top suggestions
    insights.improvementSuggestions = [...new Set(allSuggestions)].slice(0, 10);
  }

  res.json({
    success: true,
    data: { insights }
  });
}));

// @route   GET /api/analytics/compare
// @desc    Compare performance across different periods or interview types
// @access  Private
router.get('/compare', requirePremium, asyncHandler(async (req, res) => {
  const { metric = 'overallScore', period1 = '30d', period2 = '90d', type } = req.query;
  const userId = req.user._id;

  // Helper function to get data for a period
  const getPeriodData = async (period) => {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const query = {
      user: userId,
      status: 'completed',
      'metadata.createdAt': { $gte: startDate }
    };

    if (type && ['hr', 'managerial', 'technical'].includes(type)) {
      query.interviewType = type;
    }

    const interviews = await Interview.find(query)
      .select(`performance.${metric} metadata.createdAt`);

    return interviews.map(interview => ({
      value: interview.performance?.[metric] || 0,
      date: interview.metadata.createdAt
    }));
  };

  const [period1Data, period2Data] = await Promise.all([
    getPeriodData(period1),
    getPeriodData(period2)
  ]);

  // Calculate statistics
  const calculateStats = (data) => {
    if (data.length === 0) return { count: 0, average: 0, trend: 0 };
    
    const values = data.map(d => d.value);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate trend (simple linear regression)
    let trend = 0;
    if (data.length > 1) {
      const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
      const xValues = sortedData.map((_, index) => index);
      const yValues = sortedData.map(d => d.value);
      
      const n = xValues.length;
      const sumX = xValues.reduce((sum, x) => sum + x, 0);
      const sumY = yValues.reduce((sum, y) => sum + y, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
      
      trend = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    return {
      count: data.length,
      average: Math.round(average * 100) / 100,
      trend: Math.round(trend * 100) / 100
    };
  };

  const period1Stats = calculateStats(period1Data);
  const period2Stats = calculateStats(period2Data);

  // Calculate improvement
  const improvement = period1Stats.average - period2Stats.average;
  const improvementPercent = period2Stats.average > 0 ? 
    Math.round((improvement / period2Stats.average) * 100) : 0;

  res.json({
    success: true,
    data: {
      comparison: {
        period1: {
          name: period1,
          stats: period1Stats
        },
        period2: {
          name: period2,
          stats: period2Stats
        },
        improvement: {
          absolute: Math.round(improvement * 100) / 100,
          percentage: improvementPercent
        }
      },
      metric,
      type: type || 'all'
    }
  });
}));

// @route   POST /api/analytics/feedback
// @desc    Generate personalized feedback and improvement suggestions
// @access  Private
router.post('/feedback', requirePremium, asyncHandler(async (req, res) => {
  const { interviewIds, focusAreas } = req.body;

  if (!interviewIds || !Array.isArray(interviewIds) || interviewIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Interview IDs are required'
    });
  }

  // Get interview data
  const interviews = await Interview.find({
    _id: { $in: interviewIds },
    user: req.user._id,
    status: 'completed'
  }).populate('resume', 'parsedData');

  if (interviews.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No completed interviews found'
    });
  }

  try {
    // Generate personalized feedback using AI
    const feedback = await aiService.generatePersonalizedFeedback(
      interviews,
      req.user
    );

    res.json({
      success: true,
      message: 'Personalized feedback generated successfully',
      data: { feedback }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   GET /api/analytics/export
// @desc    Export analytics data
// @access  Private
router.get('/export', requirePremium, asyncHandler(async (req, res) => {
  const { format = 'json', period = '90d' } = req.query;
  const userId = req.user._id;

  // Calculate date range
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 90);
  }

  // Get data
  const interviews = await Interview.find({
    user: userId,
    'metadata.createdAt': { $gte: startDate }
  }).populate('resume', 'originalFile.originalName');

  const resumes = await Resume.find({
    user: userId,
    'metadata.createdAt': { $gte: startDate }
  });

  const exportData = {
    period,
    generatedAt: new Date().toISOString(),
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.fullName
    },
    interviews: interviews.map(interview => ({
      id: interview._id,
      type: interview.interviewType,
      status: interview.status,
      performance: interview.performance,
      metadata: interview.metadata,
      resumeName: interview.resume?.originalFile?.originalName
    })),
    resumes: resumes.map(resume => ({
      id: resume._id,
      status: resume.status,
      analysis: resume.aiAnalysis,
      metadata: resume.metadata
    }))
  };

  if (format === 'csv') {
    // TODO: Implement CSV export
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${period}-${Date.now()}.csv`);
    res.send('CSV export not yet implemented');
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${period}-${Date.now()}.json`);
    res.json(exportData);
  }
}));

export default router;

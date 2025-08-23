import express from 'express';
import aiService from '../services/aiService.js';
import { requirePremium } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   POST /api/ai/chat
// @desc    Chat with AI for interview preparation
// @access  Private
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, context, interviewType } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Message is required'
    });
  }

  try {
    // Create a contextual prompt based on the user's request
    let systemPrompt = 'You are an expert interview coach helping users prepare for interviews.';
    
    if (interviewType) {
      const typeContexts = {
        hr: 'Focus on behavioral questions, company fit, and soft skills.',
        managerial: 'Focus on leadership, project management, and strategic thinking.',
        technical: 'Focus on technical skills, problem-solving, and industry knowledge.'
      };
      systemPrompt += ` The user is preparing for a ${interviewType} interview. ${typeContexts[interviewType]}`;
    }

    if (context) {
      systemPrompt += ` Context: ${context}`;
    }

    const response = await aiService.openai.chat.completions.create({
      model: aiService.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    res.json({
      success: true,
      data: {
        response: response.choices[0].message.content,
        usage: response.usage
      }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/ai/feedback
// @desc    Get AI feedback on interview responses
// @access  Private
router.post('/feedback', asyncHandler(async (req, res) => {
  const { question, response, context } = req.body;

  if (!question || !response) {
    return res.status(400).json({
      success: false,
      error: 'Question and response are required'
    });
  }

  try {
    const feedback = await aiService.evaluateResponse(
      question,
      response,
      '', // No model answer provided
      [] // No expected keywords provided
    );

    res.json({
      success: true,
      data: { feedback }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/ai/resume-tips
// @desc    Get AI-generated resume tips
// @access  Private
router.post('/resume-tips', asyncHandler(async (req, res) => {
  const { industry, experienceLevel, targetRole } = req.body;

  try {
    const prompt = `
      Provide specific, actionable resume tips for:
      Industry: ${industry || 'general'}
      Experience Level: ${experienceLevel || 'mid-level'}
      Target Role: ${targetRole || 'any'}
      
      Please provide tips in the following JSON format:
      {
        "general": ["tip1", "tip2"],
        "industrySpecific": ["tip1", "tip2"],
        "formatting": ["tip1", "tip2"],
        "keywords": ["keyword1", "keyword2"],
        "commonMistakes": ["mistake1", "mistake2"]
      }
    `;

    const response = await aiService.openai.chat.completions.create({
      model: aiService.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.3
    });

    const tips = JSON.parse(response.choices[0].message.content);

    res.json({
      success: true,
      data: { tips }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/ai/interview-prep
// @desc    Get personalized interview preparation plan
// @access  Private
router.post('/interview-prep', requirePremium, asyncHandler(async (req, res) => {
  const { interviewType, targetRole, experienceLevel, timeAvailable } = req.body;

  if (!interviewType || !targetRole) {
    return res.status(400).json({
      success: false,
      error: 'Interview type and target role are required'
    });
  }

  try {
    const prompt = `
      Create a personalized interview preparation plan for:
      Interview Type: ${interviewType}
      Target Role: ${targetRole}
      Experience Level: ${experienceLevel || 'mid-level'}
      Time Available: ${timeAvailable || '1 week'}
      
      Please provide a plan in the following JSON format:
      {
        "timeline": [
          {
            "day": "Day 1",
            "focus": "focus area",
            "activities": ["activity1", "activity2"],
            "estimatedTime": "2 hours"
          }
        ],
        "keyAreas": ["area1", "area2"],
        "resources": [
          {
            "type": "article/video/practice",
            "title": "resource title",
            "description": "description",
            "url": "optional url"
          }
        ],
        "practiceQuestions": ["question1", "question2"],
        "successMetrics": ["metric1", "metric2"]
      }
    `;

    const response = await aiService.openai.chat.completions.create({
      model: aiService.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.4
    });

    const plan = JSON.parse(response.choices[0].message.content);

    res.json({
      success: true,
      data: { plan }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/ai/skill-analysis
// @desc    Analyze skills and suggest improvements
// @access  Private
router.post('/skill-analysis', asyncHandler(async (req, res) => {
  const { currentSkills, targetRole, industry } = req.body;

  if (!currentSkills || !targetRole) {
    return res.status(400).json({
      success: false,
      error: 'Current skills and target role are required'
    });
  }

  try {
    const prompt = `
      Analyze the following skills for a ${targetRole} role in ${industry || 'general'} industry:
      
      Current Skills: ${currentSkills.join(', ')}
      
      Please provide analysis in the following JSON format:
      {
        "skillGaps": [
          {
            "skill": "skill name",
            "importance": "high/medium/low",
            "priority": "immediate/short-term/long-term",
            "suggestion": "how to acquire this skill",
            "resources": ["resource1", "resource2"]
          }
        ],
        "skillStrengths": ["strength1", "strength2"],
        "developmentPlan": [
          {
            "phase": "immediate/short-term/long-term",
            "skills": ["skill1", "skill2"],
            "timeline": "estimated time",
            "actions": ["action1", "action2"]
          }
        ],
        "marketRelevance": "how relevant these skills are in the current market"
      }
    `;

    const response = await aiService.openai.chat.completions.create({
      model: aiService.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    res.json({
      success: true,
      data: { analysis }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   POST /api/ai/company-research
// @desc    Get AI-generated company research insights
// @access  Private
router.post('/company-research', requirePremium, asyncHandler(async (req, res) => {
  const { companyName, role, industry } = req.body;

  if (!companyName || !role) {
    return res.status(400).json({
      success: false,
      error: 'Company name and role are required'
    });
  }

  try {
    const prompt = `
      Provide comprehensive company research insights for ${companyName} for a ${role} position in ${industry || 'general'} industry:
      
      Please provide insights in the following JSON format:
      {
        "companyOverview": {
          "industry": "industry",
          "size": "company size",
          "culture": "company culture description",
          "values": ["value1", "value2"]
        },
        "roleInsights": {
          "responsibilities": ["responsibility1", "responsibility2"],
          "requirements": ["requirement1", "requirement2"],
          "growthOpportunities": ["opportunity1", "opportunity2"]
        },
        "interviewPreparation": {
          "commonQuestions": ["question1", "question2"],
          "companySpecificQuestions": ["question1", "question2"],
          "researchTopics": ["topic1", "topic2"],
          "questionsToAsk": ["question1", "question2"]
        },
        "companyNews": "recent relevant news or developments",
        "competitors": ["competitor1", "competitor2"]
      }
    `;

    const response = await aiService.openai.chat.completions.create({
      model: aiService.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2500,
      temperature: 0.4
    });

    const insights = JSON.parse(response.choices[0].message.content);

    res.json({
      success: true,
      data: { insights }
    });
  } catch (error) {
    throw error;
  }
}));

// @route   GET /api/ai/status
// @desc    Check AI service status
// @access  Public
router.get('/status', asyncHandler(async (req, res) => {
  try {
    const isHealthy = await aiService.initialize();
    
    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        model: aiService.model,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.json({
      success: false,
      data: {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
}));

export default router;

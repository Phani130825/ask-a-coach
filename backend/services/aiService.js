import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 3,
      timeout: parseInt(process.env.AI_SERVICE_TIMEOUT) || 30000
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 4000;
    this.isAvailable = false;
  }

  // Initialize AI services
  async initialize() {
    try {
      // Test OpenAI connection
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10
      });
      
      console.log('✅ AI Service initialized successfully');
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      if (error.message.includes('quota') || error.message.includes('billing')) {
        console.warn('⚠️  OpenAI quota exceeded or billing issue. AI features will be limited.');
        console.warn('💡 Please check your OpenAI billing or upgrade your plan.');
        return false;
      } else {
        console.error('❌ AI Service initialization failed:', error.message);
        return false;
      }
    }
  }

  // Check if AI service is available
  checkAvailability() {
    if (!this.isAvailable) {
      throw new Error('AI service is not available. Please check your OpenAI configuration and billing.');
    }
  }

  // Resume Analysis and Tailoring
  async analyzeResume(resumeText, jobDescription) {
    this.checkAvailability();
    try {
      const prompt = `
        Analyze the following resume against the job description and provide detailed feedback:
        
        RESUME:
        ${resumeText}
        
        JOB DESCRIPTION:
        ${jobDescription}
        
        Please provide analysis in the following JSON format:
        {
          "skillsMatch": {
            "matchedSkills": ["skill1", "skill2"],
            "missingSkills": ["skill3", "skill4"],
            "skillGaps": [
              {
                "skill": "skill name",
                "importance": "high/medium/low",
                "suggestion": "how to acquire this skill"
              }
            ]
          },
          "experienceRelevance": {
            "relevantExperience": ["experience1", "experience2"],
            "suggestedImprovements": ["improvement1", "improvement2"],
            "keywordOptimization": ["keyword1", "keyword2"]
          },
          "overallScore": {
            "atsCompatibility": 8.5,
            "contentQuality": 7.8,
            "skillAlignment": 8.2,
            "totalScore": 8.2
          },
          "suggestions": [
            "suggestion1",
            "suggestion2"
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Resume analysis failed:', error);
      throw new Error('Failed to analyze resume');
    }
  }

  // Generate tailored resume content
  async tailorResume(resumeData, jobDescription, templateType = 'professional') {
    this.checkAvailability();
    try {
      const prompt = `
        Create a tailored version of this resume for the specific job description:
        
        RESUME DATA:
        ${JSON.stringify(resumeData, null, 2)}
        
        JOB DESCRIPTION:
        ${jobDescription}
        
        TEMPLATE TYPE: ${templateType}
        
        Please provide tailored content in the following JSON format:
        {
          "summary": "tailored professional summary",
          "experience": [
            {
              "title": "job title",
              "company": "company name",
              "description": ["tailored bullet point 1", "tailored bullet point 2"],
              "relevance": 9.2
            }
          ],
          "skills": ["tailored skill 1", "tailored skill 2"],
          "keywords": ["keyword1", "keyword2"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.4
      });

      const tailoredContent = JSON.parse(response.choices[0].message.content);
      return tailoredContent;
    } catch (error) {
      console.error('Resume tailoring failed:', error);
      throw new Error('Failed to tailor resume');
    }
  }

  // Generate interview questions
  async generateInterviewQuestions(resumeData, jobDescription, interviewType, questionCount = 10) {
    this.checkAvailability();
    try {
      const typeSpecificPrompts = {
        hr: 'Focus on behavioral questions, company fit, career goals, and soft skills.',
        managerial: 'Focus on leadership, project management, team collaboration, and strategic thinking.',
        technical: 'Focus on role-specific technical questions, problem-solving, and theoretical concepts.'
      };

      const prompt = `
        Generate ${questionCount} interview questions for a ${interviewType} interview based on:
        
        RESUME DATA:
        ${JSON.stringify(resumeData, null, 2)}
        
        JOB DESCRIPTION:
        ${jobDescription}
        
        INTERVIEW TYPE: ${interviewType}
        ${typeSpecificPrompts[interviewType]}
        
        Please provide questions in the following JSON format:
        {
          "questions": [
            {
              "question": "Question text here?",
              "category": "category name",
              "difficulty": "easy/medium/hard",
              "expectedKeywords": ["keyword1", "keyword2"],
              "modelAnswer": "Model answer here with key points and structure"
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.5
      });

      const questions = JSON.parse(response.choices[0].message.content);
      return questions.questions;
    } catch (error) {
      console.error('Question generation failed:', error);
      throw new Error('Failed to generate interview questions');
    }
  }

  // Evaluate interview responses
  async evaluateResponse(question, userResponse, modelAnswer, expectedKeywords) {
    this.checkAvailability();
    try {
      const prompt = `
        Evaluate this interview response against the model answer and expected keywords:
        
        QUESTION: ${question}
        USER RESPONSE: ${userResponse}
        MODEL ANSWER: ${modelAnswer}
        EXPECTED KEYWORDS: ${expectedKeywords.join(', ')}
        
        Please provide evaluation in the following JSON format:
        {
          "contentScore": 8.5,
          "keywordMatch": 7.8,
          "clarity": 8.2,
          "relevance": 8.0,
          "overallScore": 8.1,
          "feedback": "Overall good response with room for improvement in...",
          "suggestions": [
            "suggestion1",
            "suggestion2"
          ],
          "aiFeedback": "AI-generated improvement suggestions..."
        }
        
        Scoring scale: 1-10 (10 being excellent)
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      const evaluation = JSON.parse(response.choices[0].message.content);
      return evaluation;
    } catch (error) {
      console.error('Response evaluation failed:', error);
      throw new Error('Failed to evaluate response');
    }
  }

  // Analyze non-verbal cues from video
  async analyzeNonVerbalCues(videoAnalysisData) {
    this.checkAvailability();
    try {
      // This would typically integrate with a video analysis service
      // For now, we'll simulate the analysis
      const prompt = `
        Analyze the following non-verbal cues from an interview video:
        
        VIDEO ANALYSIS DATA:
        ${JSON.stringify(videoAnalysisData, null, 2)}
        
        Please provide analysis in the following JSON format:
        {
          "eyeContact": 8.5,
          "posture": 7.8,
          "gestures": 8.2,
          "facialExpressions": 8.0,
          "confidence": 8.1,
          "overallScore": 8.1,
          "feedback": "Good eye contact and confident posture. Consider reducing fidgeting."
        }
        
        Scoring scale: 1-10 (10 being excellent)
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Non-verbal analysis failed:', error);
      throw new Error('Failed to analyze non-verbal cues');
    }
  }

  // Generate personalized feedback and improvement suggestions
  async generatePersonalizedFeedback(interviewData, userProfile) {
    this.checkAvailability();
    try {
      const prompt = `
        Generate personalized feedback and improvement suggestions based on:
        
        INTERVIEW DATA:
        ${JSON.stringify(interviewData, null, 2)}
        
        USER PROFILE:
        ${JSON.stringify(userProfile, null, 2)}
        
        Please provide feedback in the following JSON format:
        {
          "overallAssessment": "Overall assessment of performance",
          "keyStrengths": ["strength1", "strength2"],
          "improvementAreas": ["area1", "area2"],
          "specificActions": [
            {
              "area": "improvement area",
              "action": "specific action to take",
              "priority": "high/medium/low",
              "timeline": "expected timeline"
            }
          ],
          "resources": [
            {
              "type": "article/video/course",
              "title": "resource title",
              "url": "resource url",
              "description": "brief description"
            }
          ],
          "nextSteps": ["step1", "step2", "step3"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.4
      });

      const feedback = JSON.parse(response.choices[0].message.content);
      return feedback;
    } catch (error) {
      console.error('Feedback generation failed:', error);
      throw new Error('Failed to generate personalized feedback');
    }
  }

  // Generate resume templates
  async generateResumeTemplate(templateType, content) {
    this.checkAvailability();
    try {
      const prompt = `
        Generate a ${templateType} resume template with the following content:
        
        CONTENT:
        ${JSON.stringify(content, null, 2)}
        
        Please provide the template in HTML format with inline CSS styling.
        The template should be professional, ATS-friendly, and visually appealing.
        Include proper semantic HTML structure and responsive design.
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Template generation failed:', error);
      throw new Error('Failed to generate resume template');
    }
  }
}

// Create singleton instance
const aiService = new AIService();

// Initialize function
export const initializeAIServices = async () => {
  return await aiService.initialize();
};

// Check if AI service is available
export const isAIServiceAvailable = () => {
  return aiService.isAvailable;
};

export default aiService;

import OpenAI from 'openai';
import axios from 'axios';
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
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 4000;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';
  this.isAvailable = false;
  }

  // Initialize AI services
  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured; AI features disabled');
        this.isAvailable = false;
        return false;
      }
      // Test OpenAI connection
      let response = null;
      if (this.openai.chat && this.openai.chat.completions && typeof this.openai.chat.completions.create === 'function') {
        response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        });
      }
      
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
    return this.isAvailable;
  }

  // Lightweight text-to-speech generator (returns base64-encoded audio). If AI is unavailable, return a silent placeholder or null.
  async generateTTS(text, opts = {}) {
    if (!text) return null;
    if (!this.checkAvailability()) {
      // Return a short generated beep-like base64 for offline mode (wav 1s silence header) or null
      try {
        // Minimal WAV file for 0.1s silence (header + no PCM data) - valid small file
        const silentWavBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
        return silentWavBase64;
      } catch (e) {
        return null;
      }
    }

    try {
      // Use OpenAI's audio.speech or equivalent if available; here we'll try using a generic approach
      if (this.openai && this.openai.audio && this.openai.audio.speech) {
        // This block is placeholder; many SDKs provide TTS endpoints with different shapes
        const response = await this.openai.audio.speech.create({ model: 'gpt-4o-mini-tts', voice: opts.voice || 'alloy', input: text });
        // SDK may return a stream or buffer; convert to base64 if buffer
        if (response && response.data) {
          const base64 = Buffer.from(response.data).toString('base64');
          return base64;
        }
      }
      // If no TTS SDK available, fallback to null
      return null;
    } catch (error) {
      console.warn('TTS generation error:', error?.message || error);
      return null;
    }
  }

  // Calculate match score using embeddings
  async calculateMatchScore(resumeText, jobDescription) {
    if (!this.checkAvailability()) {
      // Simple heuristic fallback
      const resumeWords = new Set((resumeText || '').toLowerCase().split(/\s+/));
      const jdWords = new Set((jobDescription || '').toLowerCase().split(/\s+/));
      const intersection = new Set([...resumeWords].filter(x => jdWords.has(x)));
      return Math.min(100, Math.round((intersection.size / jdWords.size) * 100));
    }

    try {
      // Get embeddings for both texts
      const [resumeEmbedding, jdEmbedding] = await Promise.all([
        this.getEmbedding(resumeText),
        this.getEmbedding(jobDescription)
      ]);

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(resumeEmbedding, jdEmbedding);
      return Math.min(100, Math.round(similarity * 100));
    } catch (error) {
      console.error('Match score calculation failed:', error);
      return 0;
    }
  }

  // Get embeddings using OpenAI
  async getEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit input size
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  // Cosine similarity calculation
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
  }

  // Generate suggestions for improvement
  async generateSuggestions(resumeData, jdData, analysis) {
    if (!this.checkAvailability()) {
      return [
        'Add quantifiable achievements with metrics and percentages.',
        'Incorporate more industry-specific keywords from the job description.',
        'Tailor your summary to highlight relevant experience for this role.',
        'Ensure your skills section matches the job requirements.',
        'Use action verbs to start bullet points in experience section.'
      ];
    }

    try {
      const prompt = `
        Based on the resume analysis, generate 5-7 specific, actionable suggestions to improve the resume for this job:

        RESUME ANALYSIS:
        ${JSON.stringify(analysis, null, 2)}

        JOB DESCRIPTION:
        ${jdData}

        Focus on:
        - Keyword optimization
        - Skills alignment
        - Experience relevance
        - Content improvements
        - ATS compatibility

        Return as a JSON array of strings.
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.4
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Suggestions generation failed:', error);
      return ['Review and incorporate job-specific keywords', 'Quantify achievements with metrics'];
    }
  }

  // Generate optimized resume text
  async generateOptimizedResumeText(resumeData, jobDescription) {
    if (!this.checkAvailability()) {
      // Return slightly modified original text
      return (resumeData.fullText || resumeData) + '\n\n[Optimized for job application]';
    }

    try {
      const prompt = `
        Rewrite the following resume to be highly optimized for the specific job description.
        Maintain all factual information but rephrase content to better match the job requirements,
        incorporate relevant keywords, and improve overall alignment.

        ORIGINAL RESUME:
        ${typeof resumeData === 'string' ? resumeData : JSON.stringify(resumeData, null, 2)}

        JOB DESCRIPTION:
        ${jobDescription}

        REQUIREMENTS:
        - Keep all factual information (dates, companies, achievements)
        - Incorporate keywords from job description naturally
        - Improve language and impact of achievements
        - Ensure ATS-friendly formatting
        - Make content more relevant to the target role

        Return the complete optimized resume text.
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Optimized resume generation failed:', error);
      return resumeData.fullText || resumeData;
    }
  }

  // Resume Analysis and Tailoring
  async analyzeResume(resumeText, jobDescription) {
    if (!this.checkAvailability()) {
      // Heuristic fallback without AI
      const text = (resumeText || '').toLowerCase();
      const jd = (jobDescription || '').toLowerCase();
      const tokenize = (s) => (s.match(/[a-zA-Z][a-zA-Z+\-#\.\s]{1,}/g) || []).map(w => w.trim()).filter(Boolean);
      const resumeTokens = new Set(tokenize(text));
      const jdTokens = Array.from(new Set(tokenize(jd)));
      const matched = jdTokens.filter(t => resumeTokens.has(t)).slice(0, 20);
      const missing = jdTokens.filter(t => !resumeTokens.has(t)).slice(0, 20);
      const score = Math.max(0, Math.min(10, (matched.length / Math.max(1, jdTokens.length)) * 10));
      return {
        skillsMatch: {
          matchedSkills: matched,
          missingSkills: missing,
          skillGaps: missing.slice(0, 10).map(s => ({ skill: s, importance: 'medium', suggestion: `Consider adding evidence for ${s}.` }))
        },
        experienceRelevance: {
          relevantExperience: matched.slice(0, 10),
          suggestedImprovements: missing.slice(0, 5).map(s => `Add a bullet addressing ${s}`),
          keywordOptimization: matched.slice(0, 10)
        },
        overallScore: {
          atsCompatibility: 7.0,
          contentQuality: 6.5,
          skillAlignment: parseFloat(score.toFixed(1)),
          totalScore: parseFloat(((6.5 + 7.0 + score) / 3).toFixed(1))
        },
        suggestions: [
          'Quantify achievements with metrics.',
          'Use strong action verbs and concise bullets.'
        ],
        lastAnalyzed: new Date()
      };
    }
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

  // Generate tailored resume content with match score and suggestions
  async tailorResume(resumeData, jobDescription, templateType = 'professional') {
    if (!this.checkAvailability()) {
      const text = JSON.stringify(resumeData || {});
      const summary = (text.substring(0, 220) + '...');
      return {
        summary: `Professional summary tailored for the role. ${summary}`,
        experience: (resumeData?.experience || []).slice(0, 5).map(e => ({
          title: e?.title || 'Experience',
          company: e?.company || '',
          description: [
            'Aligned accomplishment demonstrating relevant skills.',
            'Quantified result with impact.'
          ],
          relevance: 8.0
        })),
        skills: (resumeData?.skills?.technical || []).slice(0, 10),
        keywords: (jobDescription || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 12),
        matchScore: 75,
        suggestions: [
          'Add quantifiable achievements with metrics.',
          'Incorporate job-specific keywords.',
          'Tailor summary to highlight relevant experience.'
        ],
        optimizedText: (resumeData?.fullText || text) + '\n\n[Basic optimization applied]'
      };
    }

    try {
      // Get match score
      const resumeText = typeof resumeData === 'string' ? resumeData : (resumeData.fullText || JSON.stringify(resumeData));
      const matchScore = await this.calculateMatchScore(resumeText, jobDescription);

      // Get analysis for suggestions
      const analysis = await this.analyzeResume(resumeText, jobDescription);
      const suggestions = await this.generateSuggestions(resumeData, jobDescription, analysis);

      // Generate optimized text
      const optimizedText = await this.generateOptimizedResumeText(resumeData, jobDescription);

      const prompt = `
        Create a tailored version of this resume for the specific job description with the following optimizations:

        RESUME DATA:
        ${JSON.stringify(resumeData, null, 2)}

        JOB DESCRIPTION:
        ${jobDescription}

        TEMPLATE TYPE: ${templateType}

        REQUIRED OPTIMIZATIONS:
        - Skills Enhancement (high impact): Add 5 relevant keywords from the job description
        - Experience Optimization (high impact): Reword achievements to match job requirements
        - Summary Refinement (medium impact): Enhanced professional summary with target role focus
        - Format Enhancement (medium impact): Improved ATS readability and structure

        Please provide tailored content in the following JSON format:
        {
          "summary": "tailored professional summary with target role focus",
          "experience": [
            {
              "title": "job title",
              "company": "company name",
              "description": ["tailored bullet point 1 with reworded achievements", "tailored bullet point 2"],
              "relevance": 9.2
            }
          ],
          "skills": ["tailored skill 1", "tailored skill 2", "5 relevant keywords from job description"],
          "keywords": ["keyword1", "keyword2", "additional relevant keywords"],
          "matchScore": ${matchScore},
          "suggestions": ${JSON.stringify(suggestions)},
          "optimizedText": "${optimizedText.replace(/"/g, '\\"')}"
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.4
      });

      const tailoredContent = JSON.parse(response.choices[0].message.content);
      return {
        ...tailoredContent,
        matchScore,
        suggestions,
        optimizedText
      };
    } catch (error) {
      console.error('Resume tailoring failed:', error);
      throw new Error('Failed to tailor resume');
    }
  }

  // Generate interview questions based on optimized resume and JD
  async generateInterviewQuestions(resumeData, jobDescription, interviewType, questionCount = 10, optimizedResumeText = null) {
    if (!this.checkAvailability()) {
      const base = [
        'Tell me about a challenging project and your impact.',
        'How do you prioritize tasks under tight deadlines?',
        'Describe a time you resolved a conflict within a team.',
        'Walk me through a recent technical problem you solved.',
        'What interests you about this role and company?'
      ];
      const jdKeywords = (jobDescription || '').split(/[\s,\n]+/).filter(Boolean).slice(0, 5);
      const questions = Array.from({ length: Math.min(questionCount, 10) }).map((_, i) => ({
        question: base[i % base.length] + (jdKeywords[i % jdKeywords.length] ? ` (mention ${jdKeywords[i % jdKeywords.length]})` : ''),
        category: interviewType || 'technical',
        difficulty: ['easy','medium','hard'][i % 3],
        expectedKeywords: jdKeywords.slice(0, 5),
        modelAnswer: 'Provide a structured STAR answer highlighting outcomes and metrics.'
      }));
      return questions;
    }
    try {
      const typeSpecificPrompts = {
        hr: 'Focus on behavioral questions, company fit, career goals, and soft skills.',
        managerial: 'Focus on leadership, project management, team collaboration, and strategic thinking.',
        technical: 'Focus on role-specific technical questions, problem-solving, and theoretical concepts.'
      };

      const resumeText = optimizedResumeText || (typeof resumeData === 'string' ? resumeData : JSON.stringify(resumeData));

      const prompt = `
        Generate ${questionCount} interview questions for a ${interviewType} interview based on BOTH the optimized resume and job description:

        OPTIMIZED RESUME TEXT:
        ${resumeText}

        JOB DESCRIPTION:
        ${jobDescription}

        INTERVIEW TYPE: ${interviewType}
        ${typeSpecificPrompts[interviewType]}

        REQUIREMENTS:
        - Questions should reference specific projects, skills, or experiences from the resume
        - Connect resume experiences to job description requirements
        - Include mix of technical/situational and behavioral/HR questions
        - For technical questions: Ask about specific technologies or projects mentioned in resume
        - For behavioral questions: Connect past experiences to company culture/values from JD

        Please provide questions in the following JSON format:
        {
          "questions": [
            {
              "question": "Question text here that references specific resume content?",
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
    if (!this.checkAvailability()) {
      const response = (userResponse || '').toLowerCase();
      const keywords = (expectedKeywords || []).map(k => String(k).toLowerCase());
      const hits = keywords.filter(k => response.includes(k)).length;
      const keywordMatch = Math.min(10, (hits / Math.max(1, keywords.length)) * 10);
      const lengthScore = Math.max(4, Math.min(9, response.split(' ').length / 20));
      const overall = parseFloat(((keywordMatch * 0.5) + (lengthScore * 0.5)).toFixed(1));
      return {
        contentScore: parseFloat(lengthScore.toFixed(1)),
        keywordMatch: parseFloat(keywordMatch.toFixed(1)),
        clarity: 7.0,
        relevance: keywordMatch,
        overallScore: overall,
        feedback: 'Good attempt. Cover key points succinctly and include outcomes.',
        suggestions: ['Use STAR format', 'Quantify results', 'Mention role-relevant keywords'],
        aiFeedback: 'Heuristic scoring due to AI unavailability.'
      };
    }
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
    if (!this.checkAvailability()) {
      return {
        eyeContact: 7.5,
        posture: 7.0,
        gestures: 6.5,
        facialExpressions: 7.2,
        confidence: 7.3,
        overallScore: 7.1,
        feedback: 'Maintain steady eye contact and an open posture.'
      };
    }
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
    if (!this.checkAvailability()) {
      return {
        overallAssessment: 'Consistent performance with clear opportunities to increase specificity.',
        keyStrengths: ['Structure', 'Calm delivery'],
        improvementAreas: ['More metrics', 'Tie answers to role requirements'],
        specificActions: [
          { area: 'Metrics', action: 'Add quantifiable outcomes to 5 bullets', priority: 'high', timeline: '1 week' },
          { area: 'Keywords', action: 'Integrate 10 JD keywords into resume', priority: 'medium', timeline: '3 days' }
        ],
        resources: [],
        nextSteps: ['Practice with mock questions', 'Revise resume bullets']
      };
    }
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
    if (!this.checkAvailability()) {
      const safe = content || {};
      const title = (safe.summary || 'Professional Resume');
      const exp = (safe.experience || []);
      const skills = (safe.skills || []);
      return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${templateType} Resume</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111827;padding:32px}
    h1{font-size:24px;margin:0 0 8px}
    h2{font-size:18px;margin:24px 0 8px;color:#374151}
    .section{margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px}
    ul{margin:8px 0 0 20px}
    .chip{display:inline-block;background:#eef2ff;color:#3730a3;border-radius:9999px;padding:4px 10px;margin:4px;font-size:12px}
  </style>
  </head>
<body>
  <h1>${title}</h1>
  <div class="section">
    <h2>Summary</h2>
    <p>${title}</p>
  </div>
  <div class="section">
    <h2>Experience</h2>
    ${exp.map(e => `<div><strong>${e.title || ''}</strong> ${e.company ? ' - ' + e.company : ''}<ul>${(e.description||[]).map(d=>`<li>${d}</li>`).join('')}</ul></div>`).join('')}
  </div>
  <div class="section">
    <h2>Skills</h2>
    <div>${skills.map(s=>`<span class="chip">${s}</span>`).join('')}</div>
  </div>
</body>
</html>`;
    }
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

  // Generate LaTeX formatted resume
  async generateLaTeXResume(content) {
    if (!this.checkAvailability()) {
      const safe = content || {};
      const name = (safe.personalInfo?.name || 'Your Name');
      const title = (safe.personalInfo?.title || 'Professional Title');
      const email = (safe.personalInfo?.email || 'email@example.com');
      const phone = (safe.personalInfo?.phone || 'Phone Number');
      const summary = (safe.summary || 'Professional summary goes here.');
      const exp = (safe.experience || []);
      const skills = (safe.skills || []);

      return `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\title{Resume}
\\author{${name}}

\\begin{document}

\\section*{${name}}
\\textbf{${title}} \\\\
${email} | ${phone}

\\section*{Professional Summary}
${summary}

\\section*{Experience}
${exp.map(e => `\\textbf{${e.title || 'Position'}} \\\\
${e.company || 'Company'} \\\\
\\begin{itemize}
${(e.description || []).map(d => `\\item ${d}`).join('\n')}
\\end{itemize}`).join('\n\n')}

\\section*{Skills}
\\begin{itemize}
${skills.map(s => `\\item ${s}`).join('\n')}
\\end{itemize}

\\end{document}`;
    }

    try {
      const prompt = `
        Generate a professional LaTeX formatted resume from the following content:

        CONTENT:
        ${JSON.stringify(content, null, 2)}

        Please provide a complete LaTeX document that includes:
        - Proper LaTeX document structure
        - Professional formatting
        - Clean sections for summary, experience, skills
        - ATS-friendly layout
        - Use appropriate LaTeX packages for formatting

        Return only the LaTeX code without any markdown formatting or explanations.
      `;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('LaTeX resume generation failed:', error);
      throw new Error('Failed to generate LaTeX resume');
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

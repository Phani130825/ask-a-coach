# Implementation Plan for Enhanced Resume Tailoring

## Information Gathered

- aiService.js already has calculateMatchScore, generateSuggestions, generateOptimizedResumeText, and updated generateInterviewQuestions with optimizedResumeText parameter
- Resume model already includes matchScore, suggestions, optimizedText fields in tailoredVersions
- interviews.js create route already uses optimizedResumeText from latest tailored version
- ResumeTailoring.tsx already displays matchScore, suggestions, optimizedText, and LaTeX generation
- InterviewSimulation.tsx loads questions from backend which uses optimized text

## Plan

1. Add keyword highlights UI in ResumeTailoring.tsx for matched/missing keywords
2. Add full testing of the entire flow (upload -> analysis -> tailoring -> LaTeX -> interview creation)
3. Verify match score accuracy and question relevance through testing
4. Add necessary dependencies for embeddings (already using OpenAI embeddings)
5. Prepare deployment with environment variables and LaTeX support

## Dependent Files to be edited

- a/src/components/ResumeTailoring.tsx: Add keyword highlights UI
- a/package.json: Add any missing dependencies
- Environment variables: Ensure OpenAI embeddings and LaTeX compilation are configured

## Followup steps

- Test the complete flow end-to-end
- Verify match score calculations
- Ensure interview questions reference optimized resume content
- Deploy with proper environment setup

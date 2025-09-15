import express from 'express';
import axios from 'axios';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const JUDGE0_API_HOST = 'judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY; // Set your Judge0 API key in environment variables

// @route   POST /api/coding/run-tests
// @desc    Run code against test cases using Judge0 API
// @access  Private
router.post('/run-tests', asyncHandler(async (req, res) => {
  const { code, language, testCases } = req.body;

  if (!code || !language || !testCases || !Array.isArray(testCases)) {
    return res.status(400).json({
      success: false,
      error: 'Code, language, and testCases array are required'
    });
  }

  if (!['javascript', 'python', 'cpp', 'java'].includes(language)) {
    return res.status(400).json({
      success: false,
      error: 'Only JavaScript, Python, C++, and Java are supported at this time'
    });
  }

  const languageMap = {
    javascript: 63, // JavaScript (Node.js 14.17.0)
    python: 71,     // Python (3.8.1)
    cpp: 54,        // C++ (GCC 9.2.0)
    java: 62        // Java (OpenJDK 13.0.1)
  };

  const results = [];

  for (const testCase of testCases) {
    try {
      const { input, expectedOutput } = testCase;

      // Submit code to Judge0
      const submissionResponse = await axios.post(
        `${JUDGE0_API_URL}?base64_encoded=false&wait=true`,
        {
          source_code: code,
          language_id: languageMap[language],
          stdin: input,
          expected_output: expectedOutput,
          cpu_time_limit: 5,
          memory_limit: 128000
        },
        {
          headers: {
            'X-RapidAPI-Host': JUDGE0_API_HOST,
            'X-RapidAPI-Key': JUDGE0_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const submission = submissionResponse.data;

      const passed = submission.status && submission.status.id === 3; // 3 means Accepted

      results.push({
        passed,
        output: submission.stdout || submission.compile_output || submission.stderr || '',
        expectedOutput,
        input
      });
    } catch (error) {
      results.push({
        passed: false,
        output: `Error: ${error.message}`,
        expectedOutput: testCase.expectedOutput,
        input: testCase.input
      });
    }
  }

  res.json({
    success: true,
    results
  });
}));

export default router;

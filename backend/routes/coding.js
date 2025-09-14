import express from 'express';
import vm from 'node:vm';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   POST /api/coding/run-tests
// @desc    Run code against test cases
// @access  Private
router.post('/run-tests', asyncHandler(async (req, res) => {
  const { code, language, testCases } = req.body;

  if (!code || !language || !testCases || !Array.isArray(testCases)) {
    return res.status(400).json({
      success: false,
      error: 'Code, language, and testCases array are required'
    });
  }

  if (language !== 'javascript') {
    return res.status(400).json({
      success: false,
      error: 'Only JavaScript is supported at this time'
    });
  }

  const results = [];

  for (const testCase of testCases) {
    try {
      const { input, expectedOutput } = testCase;

      // Parse input arguments
      const args = parseInput(input);

      // Execute code
      const output = await executeJavaScript(code, args);

      // Compare output
      const passed = compareOutputs(output, expectedOutput);

      results.push({
        passed,
        output: JSON.stringify(output),
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

// Helper function to parse input string into arguments array
function parseInput(input) {
  // Split by ', ' and try to parse each part
  const parts = input.split(', ');
  const args = [];

  for (const part of parts) {
    try {
      // Try to parse as JSON
      args.push(JSON.parse(part));
    } catch {
      // If not JSON, treat as string (remove quotes if present)
      let str = part;
      if (str.startsWith('"') && str.endsWith('"')) {
        str = str.slice(1, -1);
      }
      args.push(str);
    }
  }

  return args;
}

// Execute JavaScript code with arguments
async function executeJavaScript(code, args) {
  // Extract function name
  const funcNameMatch = code.match(/function\s+(\w+)/);
  if (!funcNameMatch) {
    throw new Error('No function found in code');
  }
  const funcName = funcNameMatch[1];

  // Wrap code in a function and call it
  const wrappedCode = `
    ${code}
    ${funcName}(...args)
  `;

  const context = {
    args,
    console: { log: () => {}, error: () => {}, warn: () => {} }, // Disable console
    setTimeout: () => {}, // Disable timers
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    process: undefined,
    global: undefined,
    require: undefined,
    __dirname: undefined,
    __filename: undefined,
  };

  const script = new vm.Script(wrappedCode, { timeout: 5000 }); // 5 second timeout
  const result = script.runInNewContext(context, { timeout: 5000 });

  return result;
}

// Compare actual output with expected
function compareOutputs(actual, expected) {
  try {
    const expectedParsed = JSON.parse(expected);
    // Deep compare
    return JSON.stringify(actual) === JSON.stringify(expectedParsed);
  } catch {
    // If expected is not JSON, compare as strings
    return JSON.stringify(actual) === expected;
  }
}

export default router;

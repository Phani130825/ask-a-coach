# TODO: Implement Dynamic Coding Round with Gemini API and Judge0 Integration

## Overview

Refactor the existing CodingRound.tsx component to:

- Dynamically load Monaco editor as in the sample code.
- Use Gemini API to generate coding problems with complete runnable boilerplate code, leaving only the core function empty.
- Use environment variables for API keys (Gemini, Judge0).
- Submit code to Judge0 API and poll for results.
- Display problem statement, input/output format, constraints, sample test cases, and code editor with generated boilerplate.
- Show test results and submission history.
- Remove hardcoded questions and starter code.

## Steps

### 1. Setup Monaco Editor

- Dynamically load Monaco editor script on component mount.
- Initialize Monaco editor with theme, language, and automatic layout.
- Set editor content to the generated boilerplate code.
- Update code state on editor content change.

### 2. Integrate Gemini API for Problem Generation

- Create a function to call Gemini API with system prompt and user query.
- Use environment variable for Gemini API key.
- Parse response JSON to extract problem details and boilerplate code.
- Store generated question in state.
- On language or question change, update Monaco editor content with boilerplate.

### 3. Implement Code Submission to Judge0 API

- Use environment variable for Judge0 API key.
- Submit code with language ID, source code, and test case input.
- Poll Judge0 API for results using tokens.
- Display test results with pass/fail status, input, output, expected output, and errors.

### 4. UI Updates

- Display problem title, description, input/output format, constraints, sample test cases.
- Language selector dropdown.
- Buttons for "Generate New Question", "Run Code", and "Submit".
- Show loading states and error messages.
- Show submission history from Firestore (if applicable).

### 5. Remove Hardcoded Questions and Starter Code

- Remove existing hardcoded questions array and starter code logic.
- Use only dynamically generated questions from Gemini API.

### 6. Backend Adjustments (if needed)

- Verify backend aiService.js supports environment variables for Gemini API key.
- No major backend changes expected.

### 7. Testing

- Test problem generation with Gemini API.
- Test code submission and result polling with Judge0 API.
- Test UI responsiveness and error handling.

## Environment Variables Needed

- GEMINI_API_KEY
- JUDGE0_API_KEY
- FIREBASE config variables (if Firestore used for submission history)

## Next Steps

- Implement step 1 and 2: Monaco editor setup and Gemini API integration.
- Confirm successful problem generation and editor update.
- Proceed with step 3: Judge0 API submission and result polling.
- Complete UI and testing.

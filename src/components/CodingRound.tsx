import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Code,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  ArrowRight,
  Loader,
} from "lucide-react";
import api, { codingAPI } from "@/services/api";

// Type declarations for Monaco Editor
declare global {
  interface Window {
    require: any;
    monaco: any;
  }
}

// Environment variables - these will be provided in your .env file
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const GEMINI_API_URL =
  import.meta.env.VITE_GEMINI_API_URL ||
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const languageMap = {
  javascript: { id: 63, name: "JavaScript" },
  python: { id: 71, name: "Python 3" },
  java: { id: 62, name: "Java" },
  cpp: { id: 54, name: "C++" },
};

const statusMap = {
  1: { status: "In Queue", color: "text-gray-400" },
  2: { status: "Processing", color: "text-yellow-400" },
  3: { status: "Accepted", color: "text-green-400" },
  4: { status: "Wrong Answer", color: "text-red-400" },
  5: { status: "Time Limit Exceeded", color: "text-red-400" },
  6: { status: "Compilation Error", color: "text-red-400" },
  7: { status: "Runtime Error", color: "text-red-400" },
  8: { status: "Memory Limit Exceeded", color: "text-red-400" },
  9: { status: "Internal Error", color: "text-red-400" },
  10: { status: "Invalid Request", color: "text-red-400" },
  11: { status: "Blacklisted", color: "text-red-400" },
  12: { status: "Internal Error", color: "text-red-400" },
};

const createRunnableCode = (userCode, mainDriver) => {
  return `${userCode}\n\n${mainDriver}`;
};

const App = () => {
  const [userId, setUserId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [finalScore, setFinalScore] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const monacoEditorRef = useRef(null);

  // Initialize Monaco Editor on mount
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/monaco-editor@0.28.1/min/vs/loader.js";
    script.onload = () => {
      window.require.config({
        paths: {
          vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.28.1/min/vs",
        },
      });
      window.require(["vs/editor/editor.main"], () => {
        monacoEditorRef.current = window.monaco.editor.create(
          document.getElementById("monaco-editor"),
          {
            value: "",
            language: language,
            theme: "vs-dark",
            automaticLayout: true,
            minimap: { enabled: false },
          }
        );

        monacoEditorRef.current.onDidChangeModelContent(() => {
          setCode(monacoEditorRef.current.getValue());
        });
        setIsEditorReady(true);
      });
    };
    document.body.appendChild(script);

    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
    };
  }, []);

  // Update editor language and content when state changes
  useEffect(() => {
    if (isEditorReady && monacoEditorRef.current && question) {
      window.monaco.editor.setModelLanguage(
        monacoEditorRef.current.getModel(),
        language
      );
      const boilerplate = question.boilerplateCode[language].functionSignature;
      monacoEditorRef.current.setValue(boilerplate);
      setCode(boilerplate);
    }
  }, [language, question, isEditorReady]);

  // Initialize user and fetch data from backend
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Generate or get user ID
        let user = localStorage.getItem("userId");
        if (!user) {
          user = "user-" + Math.random().toString(36).substr(2, 9);
          localStorage.setItem("userId", user);
        }
        setUserId(user);

        // Fetch submission history from backend
        try {
          const response = await api.get(`/submissions/${user}`);
          setSubmissionHistory(response.data);
        } catch (e) {
          console.error("Error fetching submission history:", e);
        }
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    };

    initializeUser();
  }, []);

  const handleGenerateQuestion = async () => {
    if (!GEMINI_API_KEY) {
      setApiError(
        "Gemini API key is not configured. Please check your environment variables."
      );
      return;
    }

    setIsLoading(true);
    setQuestion(null);
    setFinalScore(null);
    setTestResults([]);
    setCode("");
    setApiError(null);

    const systemPrompt = `You are a coding problem generator. Generate a problem with the following JSON schema. 

CRITICAL REQUIREMENTS FOR BOILERPLATE CODE:
1. Generate COMPLETE, RUNNABLE code for each language
2. Include ALL necessary imports, class definitions, and driver code
3. Leave ONLY the core algorithm/logic function empty with a TODO comment
4. The empty function should have the correct signature and parameter names
5. All input parsing, function calls, and output printing should be fully implemented
6. The user should only need to fill in ONE function body

LANGUAGE-SPECIFIC REQUIREMENTS:

PYTHON:
- Include complete main execution block with if __name__ == "__main__":
- Parse all inputs from stdin using input().strip() or appropriate methods
- Call the solution function with parsed arguments
- Print the result directly
- Leave only the core logic function empty with TODO comment and hints

JAVASCRIPT:
- Use readline or process.stdin for input handling
- Include complete input parsing and output logic
- Leave only the main function empty with TODO comment

JAVA:
- Include complete class structure with main method
- Use Scanner for input parsing
- Include all necessary imports (Scanner, etc.)
- Leave only the solution method in Solution class empty
- Handle all input parsing and method calls in main()

C++:
- Include all necessary headers (#include statements)
- Complete main() function with input/output handling
- Leave only the solution function empty in the class
- Use appropriate input methods (cin, getline, etc.)

The boilerplate should be so complete that users can immediately run it after filling in just the core function logic.`;

    const userQuery = `Generate a coding problem for a medium difficulty challenge. The problem should have:
1. Clear description with examples
2. Proper input/output formats and constraints
3. 3 sample test cases and 5 hidden test cases
4. COMPLETE boilerplate code for all languages

For the boilerplate code:
- Generate FULL, COMPLETE, RUNNABLE code
- Include ALL imports, input parsing, main/driver code
- Leave ONLY ONE core function empty with TODO comments and hints
- User should only fill in the algorithm logic, nothing else
- Test cases should work immediately after user implements the core function

Example of what the Python boilerplate should look like:
\`\`\`python
def solution_function(param1, param2):
    # TODO: Implement the core algorithm here
    # Hint: [specific hint about the approach]
    # Your code here
    pass

if __name__ == "__main__":
    # Complete input parsing
    line1 = input().strip()
    line2 = input().strip()
    # Parse inputs appropriately
    param1 = int(line1)
    param2 = list(map(int, line2.split()))
    
    # Call solution and print result
    result = solution_function(param1, param2)
    print(result)
\`\`\`

Make the boilerplate similarly complete for all other languages.`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            functionName: { type: "STRING" },
            description: { type: "STRING" },
            inputFormat: { type: "STRING" },
            outputFormat: { type: "STRING" },
            constraints: { type: "STRING" },
            boilerplateCode: {
              type: "OBJECT",
              properties: {
                javascript: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core function empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
                python: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core function empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
                java: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core method in Solution class empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
                cpp: {
                  type: "OBJECT",
                  properties: {
                    functionSignature: {
                      type: "STRING",
                      description:
                        "Complete code with only core function empty",
                    },
                    mainDriver: {
                      type: "STRING",
                      description:
                        "Empty string as all code is in functionSignature",
                    },
                  },
                },
              },
            },
            sampleTestCases: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  input: { type: "STRING" },
                  output: { type: "STRING" },
                },
              },
            },
            hiddenTestCases: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  input: { type: "STRING" },
                  output: { type: "STRING" },
                },
              },
            },
          },
        },
      },
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const data = await response.json();
      const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error("Invalid response from API. No text content found.");
      }

      let generatedQuestion;
      try {
        generatedQuestion = JSON.parse(textContent);
      } catch (e) {
        throw new Error("Gemini response was not valid JSON: " + textContent);
      }

      setQuestion(generatedQuestion);
      if (isEditorReady && monacoEditorRef.current) {
        const boilerplate =
          generatedQuestion.boilerplateCode[language].functionSignature;
        monacoEditorRef.current.setValue(boilerplate);
        setCode(boilerplate);
      }
    } catch (error) {
      console.error("Error generating question:", error);
      setApiError(
        `Failed to generate question. Error: ${error.message}. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setModalMessage(null);
  };

  const submitToBackend = async (isSubmit) => {
    if (!question || isLoading) return;

    setIsLoading(true);
    setFinalScore(null);
    setTestResults([]);
    setApiError(null);

    const testCases = isSubmit
      ? [...question.sampleTestCases, ...question.hiddenTestCases]
      : question.sampleTestCases;

    const fullCode = createRunnableCode(
      code,
      question.boilerplateCode[language].mainDriver
    );

    try {
      const response = await codingAPI.runTests({
        code: fullCode,
        language,
        testCases: testCases.map((tc) => ({
          input: tc.input,
          expectedOutput: tc.output,
        })),
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || "Backend returned error");
      }

      // Transform backend results to match frontend format
      const allResults = data.results.map((result, index) => ({
        status_id: result.passed ? 3 : 4, // 3 = Accepted, 4 = Wrong Answer
        stdout: result.output,
        stderr: result.passed ? "" : "Wrong Answer",
        input: result.input,
        expected: result.expectedOutput,
        type: index < question.sampleTestCases.length ? "Sample" : "Hidden",
        time: "N/A", // Backend doesn't provide time
        memory: "N/A", // Backend doesn't provide memory
      }));

      setTestResults(allResults);

      if (isSubmit && BACKEND_URL && userId) {
        const passedSubmissions = allResults.filter(
          (res) => res.status_id === 3
        );
        const score = (passedSubmissions.length / allResults.length) * 100;
        setFinalScore(score);

        const submissionData = {
          userId: userId,
          questionTitle: question.title,
          language: languageMap[language].name,
          score: score,
          passedCount: passedSubmissions.length,
          totalTestCases: allResults.length,
          submittedAt: new Date(),
          results: JSON.stringify(allResults),
        };

        try {
          await api.post("/submissions", submissionData);
          // Refresh submission history
          const historyResponse = await api.get(`/submissions/${userId}`);
          setSubmissionHistory(historyResponse.data);
        } catch (e) {
          console.error("Error saving submission to backend:", e);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error submitting code to backend:", error);
      setIsLoading(false);
      setApiError(
        `Failed to submit code for execution. Error: ${error.message}`
      );
    }
  };

  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen p-4 font-sans antialiased">
      <style>{`
        .monaco-editor-container {
          height: 500px;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border: 1px solid #333;
        }
        .animate-pulse-bg {
          animation: pulse-bg 2s infinite;
        }
        @keyframes pulse-bg {
          0%, 100% {
            background-color: #3f83f8;
          }
          50% {
            background-color: #2563eb;
          }
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: #1a202c;
          padding: 2rem;
          border-radius: 0.5rem;
          box-shadow: 10px 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
          max-width: 90%;
          min-width: 300px;
          text-align: center;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #333;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #555;
          border-radius: 4px;
        }
      `}</style>

      {modalMessage && (
        <div className="modal-overlay">
          <div className="modal-content">
            <p className="text-lg text-gray-200 mb-4">{modalMessage}</p>
            <button
              onClick={closeModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-blue-400">
            AI Code Challenge
          </h1>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <span className="text-gray-400">User ID:</span>
            <span className="bg-gray-800 text-blue-300 font-mono px-2 py-1 rounded-md text-sm truncate">
              {userId || "Loading..."}
            </span>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Question Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-200">
                Problem Statement
              </h2>
              <button
                onClick={handleGenerateQuestion}
                disabled={isLoading}
                className={`flex items-center gap-2 py-2 px-4 rounded-full font-semibold transition-colors ${
                  isLoading
                    ? "bg-blue-800 text-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white animate-pulse-bg"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate New Question
                    <Code className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {apiError && (
              <div className="bg-red-900 p-3 rounded-md text-red-300 mb-4">
                {apiError}
              </div>
            )}

            {isLoading && !question && (
              <div className="text-center text-gray-500 py-20">
                <Loader className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
                <p className="text-blue-400">
                  The AI is generating your problem...
                </p>
              </div>
            )}

            {question && (
              <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-xl font-bold mb-2">{question.title}</h3>
                <p className="text-gray-300 mb-4">{question.description}</p>

                <h4 className="text-lg font-semibold mt-4 mb-2">
                  Input Format
                </h4>
                <p className="text-gray-300 mb-4">{question.inputFormat}</p>

                <h4 className="text-lg font-semibold mb-2">Output Format</h4>
                <p className="text-gray-300 mb-4">{question.outputFormat}</p>

                <h4 className="text-lg font-semibold mb-2">Constraints</h4>
                <p className="text-gray-300 mb-4">{question.constraints}</p>

                <h4 className="text-lg font-semibold mb-2">
                  Sample Test Cases
                </h4>
                {question.sampleTestCases.map((test, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg mb-2">
                    <p className="font-mono text-sm text-gray-400">
                      Input: {test.input}
                    </p>
                    <p className="font-mono text-sm text-gray-400">
                      Output: {test.output}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Code Editor Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">
              Your Solution
            </h2>

            <div className="flex items-center space-x-4 mb-4">
              <label htmlFor="language-select" className="text-gray-400">
                Language:
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 text-white p-2 rounded-md"
              >
                {Object.keys(languageMap).map((key) => (
                  <option key={key} value={key}>
                    {languageMap[key].name}
                  </option>
                ))}
              </select>
            </div>

            <div
              id="monaco-editor"
              className="monaco-editor-container flex-grow mb-4"
            ></div>

            <div className="flex justify-end gap-4 mt-auto">
              <button
                onClick={() => submitToBackend(false)}
                disabled={!question || isLoading}
                className={`flex items-center gap-2 py-2 px-6 rounded-full font-semibold transition-colors ${
                  !question || isLoading
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <Play className="w-4 h-4" />
                Run Code
              </button>
              <button
                onClick={() => submitToBackend(true)}
                disabled={!question || isLoading}
                className={`flex items-center gap-2 py-2 px-6 rounded-full font-semibold transition-colors ${
                  !question || isLoading
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Trophy className="w-4 h-4" />
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Results and Submission History */}
        <div className="mt-6 flex flex-col lg:flex-row gap-6">
          {/* Results Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">Results</h2>

            {finalScore !== null && (
              <div className="mb-4 text-center">
                <p className="text-xl font-bold">
                  Final Score:
                  <span
                    className={`ml-2 font-extrabold ${
                      finalScore >= 80 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {finalScore.toFixed(0)} / 100
                  </span>
                </p>
                <p className="text-sm text-gray-400">
                  Hidden test cases are included in the score.
                </p>
              </div>
            )}

            <div className="overflow-y-auto max-h-96 pr-2 custom-scrollbar">
              {testResults.length > 0 ? (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg mb-2 border-l-4 ${
                      statusMap[result.status_id]?.color.replace(
                        "text",
                        "border"
                      ) || "border-gray-400"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-lg font-semibold text-gray-100">
                        Test Case #{index + 1}
                      </p>
                      <Badge
                        className={`${
                          statusMap[result.status_id]?.color || "text-gray-400"
                        }`}
                      >
                        {statusMap[result.status_id]?.status || "Unknown"}
                      </Badge>
                    </div>
                    {result.status_id !== 6 && (
                      <>
                        <p className="text-gray-300 font-mono text-sm">
                          Input: {result.input}
                        </p>
                        <p className="text-gray-300 font-mono text-sm">
                          Your Output: {result.stdout || "No output"}
                        </p>
                        <p className="text-gray-300 font-mono text-sm">
                          Expected Output: {result.expected}
                        </p>
                      </>
                    )}
                    {result.stderr && (
                      <p className="text-red-300 text-sm">
                        Error: {result.stderr}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-2">
                      Type: {result.type}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Runtime: {result.time}s
                    </p>
                    <p className="text-gray-400 text-xs">
                      Memory: {result.memory}kb
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-10">
                  Run or submit your code to see results here.
                </p>
              )}
            </div>
          </div>

          {/* Submission History Panel */}
          <div className="lg:w-1/2 p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold text-gray-200 mb-4">
              Submission History
            </h2>
            <div className="overflow-y-auto max-h-96 pr-2 custom-scrollbar">
              {submissionHistory.length > 0 ? (
                submissionHistory.map((sub, index) => (
                  <div
                    key={sub._id || index}
                    className="bg-gray-700 p-4 rounded-lg mb-2"
                  >
                    <p className="text-lg font-semibold text-gray-200">
                      {sub.questionTitle}
                    </p>
                    <div className="text-sm text-gray-400 mt-1">
                      <p>Language: {sub.language}</p>
                      <p>
                        Score:{" "}
                        <span
                          className={`font-bold ${
                            sub.score >= 80 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {sub.score?.toFixed(0) || 0}
                        </span>{" "}
                        / 100
                      </p>
                      <p>
                        Passed: {sub.passedCount} / {sub.totalTestCases}
                      </p>
                      <p>
                        Submitted At:{" "}
                        {sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-10">
                  No submissions yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

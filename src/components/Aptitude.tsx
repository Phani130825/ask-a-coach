import React, { useState } from 'react';

const API_KEY = import.meta.env.VITE_API_KEY || ""; // Load API key from .env file
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" + API_KEY;

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface AptitudeProps {
  onProceed?: () => void;
}

const Aptitude = ({ onProceed }: AptitudeProps) => {
  const [stage, setStage] = useState<'initial' | 'loading' | 'questions' | 'results' | 'error'>('initial');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [score, setScore] = useState<number>(0);

  const fetchQuestions = async () => {
    setStage('loading');
    setErrorMessage('');
    const userPrompt = "Generate 25 unique multiple-choice questions for a general aptitude test. Each question should be a logical, mathematical, or reasoning problem. Each question object must contain a 'question' (string), an 'options' array (array of 4 strings), and a 'correctAnswer' (string) that is one of the options. Ensure the correct answer is accurately represented within the options. The questions should be diverse and cover topics such as logical reasoning, pattern recognition, quantitative aptitude, and problem-solving.";
    const systemInstruction = {
      parts: [{ text: "You are a specialized AI designed to create educational quiz questions. Your task is to generate 25 multiple-choice questions formatted as a JSON array. Each question must have a question text, four options, and a single correct answer." }]
    };

    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              "question": { "type": "STRING" },
              "options": {
                "type": "ARRAY",
                "items": { "type": "STRING" },
                "minItems": 4,
                "maxItems": 4
              },
              "correctAnswer": { "type": "STRING" }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      },
      systemInstruction: systemInstruction
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("API error: " + response.statusText);
      }

      const result = await response.json();
      const jsonString = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonString) {
        throw new Error("Invalid response format from the API.");
      }
      const fetchedQuestions: Question[] = JSON.parse(jsonString);

      if (fetchedQuestions.length === 0) {
        throw new Error("No questions were generated.");
      }
      setQuestions(fetchedQuestions);
      setStage('questions');
    } catch (error) {
      console.error("Failed to fetch questions:", error);
      setErrorMessage('Failed to fetch questions. Please try again.');
      setStage('error');
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
  };

  const handleSubmit = () => {
    let calculatedScore = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        calculatedScore++;
      }
    });
    setScore(calculatedScore);
    setStage('results');
    // Update pipeline stage to aptitude completed
    import('@/lib/pipeline').then(({ updateStage }) => {
      updateStage('aptitude');
    });
  };

  const handleRetry = () => {
    setAnswers({});
    setScore(0);
    setStage('initial');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-teal-700">General Aptitude Test</h1>
          <p className="mt-2 text-gray-600">Test your logical and quantitative skills with 25 dynamic questions.</p>
        </header>

        {stage === 'initial' && (
          <div className="flex flex-col items-center">
            <button
              onClick={fetchQuestions}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              Start Test
            </button>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
            <p className="mt-4 text-gray-500 font-medium">Generating your questions...</p>
          </div>
        )}

        {stage === 'questions' && (
          <>
            <form>
              {questions.map((q, idx) => (
                <div key={idx} className="bg-white p-6 rounded-lg shadow-md mb-6">
                  <p className="text-lg font-semibold mb-4 text-gray-800">{idx + 1}. {q.question}</p>
                  <div className="space-y-3">
                    {q.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="radio"
                          name={"question-" + idx}
                          value={option}
                          checked={answers[idx] === option}
                          onChange={() => handleAnswerChange(idx, option)}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </form>
            <div className="mt-8 text-center">
              <button
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
                disabled={Object.keys(answers).length !== questions.length}
              >
                Submit Answers
              </button>
            </div>
          </>
        )}

        {stage === 'results' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Results</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {questions.map((q, idx) => {
                const isCorrect = answers[idx] === q.correctAnswer;
                const yourAnswer = answers[idx] || 'No answer';
                return (
                  <div
                    key={idx}
                    className={
                      "p-4 rounded-lg border-2 " +
                      (isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")
                    }
                  >
                    <p className={
                      "font-bold " + (isCorrect ? "text-green-700" : "text-red-700")
                    }>
                      {idx + 1}. {q.question}
                    </p>
                    <p className="text-sm mt-2">
                      {isCorrect ? (
                        <span className="text-green-600">Correct!</span>
                      ) : (
                        <span className="text-red-600">Incorrect.</span>
                      )} Your answer: {yourAnswer}. The correct answer was: <strong>{q.correctAnswer}</strong>
                    </p>
                  </div>
                );
              })}
            </div>
            <h2 className="text-3xl font-bold my-6">You scored {score} out of {questions.length}!</h2>
            <button
              onClick={() => {
                if (onProceed) {
                  onProceed();
                } else {
                  // Fallback to localStorage navigation
                  try {
                    localStorage.setItem('navigateTo', 'coding');
                  } catch (e) { /* ignore */ }
                  window.location.reload();
                }
              }}
              className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              Proceed to Coding Round
            </button>
            <button
              onClick={handleRetry}
              className="mt-4 ml-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center text-red-600 bg-red-100 rounded-lg p-4 mt-4">
            <p>{errorMessage}</p>
            <button
              onClick={fetchQuestions}
              className="mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Aptitude;

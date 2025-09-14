import React, { useState } from 'react';
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
  ArrowRight
} from "lucide-react";
import { codingAPI } from "@/services/api";

interface CodingRoundProps {
  onProceed?: () => void;
}

interface CodingQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  examples: {
    input: string;
    output: string;
    explanation: string;
  }[];
  starterCode: string;
  testCases: {
    input: string;
    expectedOutput: string;
  }[];
}

const languages = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' }
];

const CodingRound = ({ onProceed }: CodingRoundProps) => {
  const [stage, setStage] = useState<'initial' | 'solving' | 'results'>('initial');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userCode, setUserCode] = useState('');
  const [results, setResults] = useState<{ passed: boolean; output: string; expectedOutput?: string; input?: string }[]>([]);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0].id);

  // Sample coding questions
  const questions: CodingQuestion[] = [
    {
      id: '1',
      title: 'Two Sum',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      difficulty: 'Easy',
      examples: [
        {
          input: 'nums = [2,7,11,15], target = 9',
          output: '[0,1]',
          explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
        }
      ],
      starterCode: `function twoSum(nums, target) {
    // Your code here
}`,
      testCases: [
        { input: '[2,7,11,15], 9', expectedOutput: '[0,1]' },
        { input: '[3,2,4], 6', expectedOutput: '[1,2]' },
        { input: '[3,3], 6', expectedOutput: '[0,1]' }
      ]
    },
    {
      id: '2',
      title: 'Valid Parentheses',
      description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
      difficulty: 'Easy',
      examples: [
        {
          input: 's = "()"',
          output: 'true',
          explanation: 'The string is valid.'
        },
        {
          input: 's = "()[]{}"',
          output: 'true',
          explanation: 'The string is valid.'
        }
      ],
      starterCode: `function isValid(s) {
    // Your code here
}`,
      testCases: [
        { input: '"()"', expectedOutput: 'true' },
        { input: '"()[]{}"', expectedOutput: 'true' },
        { input: '"(]"', expectedOutput: 'false' }
      ]
    }
  ];

  const startRound = () => {
    setStage('solving');
    setCurrentQuestion(0);
    setUserCode(questions[0].starterCode);
    setResults([]);
    setTimeElapsed(0);
  };

  const runTests = async () => {
    setIsRunning(true);
    try {
      const currentQ = questions[currentQuestion];
      const response = await codingAPI.runTests({
        code: userCode,
        language: selectedLanguage,
        testCases: currentQ.testCases,
      });
      setResults(response.data.results);
    } catch (error) {
      setResults([{ passed: false, output: error.response?.data?.error || error.message || 'Error running tests', input: '', expectedOutput: '' }]);
    }
    setIsRunning(false);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setUserCode(questions[currentQuestion + 1].starterCode);
      setResults([]);
    } else {
      setStage('results');
      // Update pipeline stage
      import('@/lib/pipeline').then(({ updateStage }) => {
        updateStage('coding');
      });
    }
  };

  const handleProceed = () => {
    if (onProceed) {
      onProceed();
    } else {
      // Fallback navigation
      try {
        localStorage.setItem('navigateTo', 'interview');
      } catch (e) { /* ignore */ }
      window.location.reload();
    }
  };

  if (stage === 'initial') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Coding Round
            </h1>
            <p className="text-gray-600">
              Test your programming skills with algorithmic challenges
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Round Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Code className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">2 Questions</h3>
                  <p className="text-sm text-gray-600">Algorithmic problems</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">45 Minutes</h3>
                  <p className="text-sm text-gray-600">Time limit</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Trophy className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Multiple Languages</h3>
                  <p className="text-sm text-gray-600">JavaScript, Python, Java</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              variant="hero"
              size="lg"
              onClick={startRound}
              className="px-12 py-4 text-lg"
            >
              <Play className="h-6 w-6 mr-2" />
              Start Coding Round
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'solving') {
    const question = questions[currentQuestion];

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                Coding Round
              </h1>
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  Question {currentQuestion + 1} of {questions.length}
                </Badge>
                <Badge className={
                  question.difficulty === 'Easy' ? 'bg-green-500' :
                  question.difficulty === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
                }>
                  {question.difficulty}
                </Badge>
              </div>
            </div>
            <Progress value={((currentQuestion + 1) / questions.length) * 100} className="h-2" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Problem Description */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    {question.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{question.description}</p>

                  {question.examples.map((example, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="font-semibold text-sm mb-2">Example {index + 1}:</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Input:</strong> {example.input}</div>
                        <div><strong>Output:</strong> {example.output}</div>
                        <div><strong>Explanation:</strong> {example.explanation}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Code Editor */}
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Code Editor</CardTitle>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {languages.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.name}</option>
                    ))}
                  </select>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    placeholder="Write your solution here..."
                    spellCheck={false}
                  />
                </CardContent>
              </Card>

              {/* Test Results */}
              {results.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Test Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.map((result, index) => (
                        <div key={index} className="p-3 rounded-lg border flex flex-col gap-1"
                          style={{ borderColor: result.passed ? 'green' : 'red' }}>
                          <div className="flex items-center justify-between">
                            {result.passed ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                              Test Case {index + 1} - {result.passed ? 'Passed' : 'Failed'}
                            </span>
                          </div>
                          {!result.passed && (
                            <div className="text-xs text-red-700">
                              <div><strong>Input:</strong> {result.input}</div>
                              <div><strong>Expected:</strong> {result.expectedOutput}</div>
                              <div><strong>Got:</strong> {result.output}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={runTests}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? 'Running Tests...' : 'Run Tests'}
                </Button>
                <Button
                  variant="hero"
                  onClick={nextQuestion}
                  disabled={results.length === 0 || results.some(r => !r.passed)}
                  className="flex-1"
                >
                  {currentQuestion < questions.length - 1 ? 'Next Question' : 'Complete Round'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results stage
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Coding Round Complete!
          </h1>
          <p className="text-gray-600">
            Great job! You've completed the coding challenges.
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="text-center py-12">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Round Completed Successfully
            </h2>
            <p className="text-gray-600 mb-6">
              You've demonstrated your coding skills. Ready for the interview simulation?
            </p>
            <Button
              variant="hero"
              size="lg"
              onClick={handleProceed}
              className="px-8 py-4 text-lg"
            >
              Proceed to Interview Simulation
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CodingRound;

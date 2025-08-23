import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  Square, 
  Camera, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff,
  Clock,
  User,
  Brain,
  AlertCircle
} from "lucide-react";

const InterviewSimulation = () => {
  const [interviewType, setInterviewType] = useState<'HR' | 'Managerial' | 'Technical'>('HR');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);

  const questions = {
    HR: [
      "Tell me about yourself and why you're interested in this position.",
      "Describe a challenging situation you faced at work and how you handled it.",
      "Where do you see yourself in 5 years?",
      "Why are you leaving your current position?",
      "What are your greatest strengths and weaknesses?"
    ],
    Managerial: [
      "How do you handle conflict within your team?",
      "Describe your leadership style and give an example.",
      "How do you prioritize tasks when everything seems urgent?",
      "Tell me about a time you had to make a difficult decision.",
      "How do you motivate underperforming team members?"
    ],
    Technical: [
      "Explain the concept of RESTful APIs and their principles.",
      "How would you optimize a slow-performing database query?",
      "Describe the difference between SQL and NoSQL databases.",
      "Walk me through your approach to debugging a complex issue.",
      "How do you ensure code quality in your development process?"
    ]
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startInterview = () => {
    setInterviewStarted(true);
    setIsRecording(true);
    setCurrentQuestion(0);
    setTimeElapsed(0);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions[interviewType].length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      endInterview();
    }
  };

  const endInterview = () => {
    setIsRecording(false);
    setInterviewStarted(false);
    // Navigate to results
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Interview Simulation
            </h1>
            <p className="text-gray-600">
              Practice with AI-powered interviews tailored to your target role
            </p>
          </div>

          {/* Interview Type Selection */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Choose Interview Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                {(['HR', 'Managerial', 'Technical'] as const).map((type) => (
                  <div
                    key={type}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      interviewType === type
                        ? 'border-brand-primary bg-brand-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setInterviewType(type)}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                        {type === 'HR' && <User className="h-6 w-6 text-brand-primary" />}
                        {type === 'Managerial' && <Brain className="h-6 w-6 text-brand-primary" />}
                        {type === 'Technical' && <Camera className="h-6 w-6 text-brand-primary" />}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{type}</h3>
                      <p className="text-sm text-gray-600">
                        {type === 'HR' && 'Behavioral questions and culture fit'}
                        {type === 'Managerial' && 'Leadership and decision-making scenarios'}
                        {type === 'Technical' && 'Role-specific technical knowledge'}
                      </p>
                      <div className="mt-3">
                        <Badge variant="secondary">
                          {questions[type].length} questions
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Camera Setup */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Camera & Audio Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="aspect-video bg-gray-900 rounded-xl mb-4 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      {cameraEnabled ? (
                        <div className="text-white text-center">
                          <Video className="h-12 w-12 mx-auto mb-2" />
                          <p>Camera Preview</p>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center">
                          <VideoOff className="h-12 w-12 mx-auto mb-2" />
                          <p>Camera Disabled</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button
                      variant={cameraEnabled ? "default" : "outline"}
                      onClick={() => setCameraEnabled(!cameraEnabled)}
                    >
                      {cameraEnabled ? <Video className="h-4 w-4 mr-2" /> : <VideoOff className="h-4 w-4 mr-2" />}
                      Camera
                    </Button>
                    <Button
                      variant={micEnabled ? "default" : "outline"}
                      onClick={() => setMicEnabled(!micEnabled)}
                    >
                      {micEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
                      Microphone
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Interview Guidelines</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-brand-primary rounded-full mt-2" />
                      Ensure good lighting and stable internet connection
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-brand-primary rounded-full mt-2" />
                      Speak clearly and maintain eye contact with camera
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-brand-primary rounded-full mt-2" />
                      Take your time to think before answering
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-brand-primary rounded-full mt-2" />
                      Interview duration: approximately 30 minutes
                    </li>
                  </ul>
                  
                  {(!cameraEnabled || !micEnabled) && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">
                            Camera or microphone is disabled
                          </p>
                          <p className="text-sm text-yellow-700">
                            Enable both for the best interview experience and accurate analysis.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Start Interview */}
          <div className="text-center">
            <Button
              variant="hero"
              size="lg"
              onClick={startInterview}
              disabled={!cameraEnabled || !micEnabled}
              className="px-12 py-4 text-lg"
            >
              <Play className="h-6 w-6 mr-2" />
              Start {interviewType} Interview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-8 bg-black/20 backdrop-blur-sm rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Badge className="bg-red-500 text-white animate-pulse">
              {isRecording && !isPaused ? 'RECORDING' : 'PAUSED'}
            </Badge>
            <div className="flex items-center gap-2 text-white">
              <Clock className="h-4 w-4" />
              {formatTime(timeElapsed)}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={togglePause}>
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button variant="destructive" onClick={endInterview}>
              <Square className="h-4 w-4 mr-2" />
              End Interview
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Interview Video */}
          <div className="lg:col-span-2">
            <Card className="bg-black border-gray-700">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="opacity-75">Interview in Progress</p>
                    </div>
                  </div>
                  
                  {/* Question Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">
                          Question {currentQuestion + 1} of {questions[interviewType].length}
                        </Badge>
                        <Badge className="bg-brand-primary">
                          {interviewType}
                        </Badge>
                      </div>
                      <p className="text-lg font-medium">
                        {questions[interviewType][currentQuestion]}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Progress */}
            <Card className="bg-white/10 backdrop-blur-sm border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Interview Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress 
                    value={(currentQuestion / questions[interviewType].length) * 100} 
                    className="h-3"
                  />
                  <div className="text-white text-sm text-center">
                    {currentQuestion} / {questions[interviewType].length} questions completed
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/10 backdrop-blur-sm border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="professional" 
                  className="w-full"
                  onClick={nextQuestion}
                  disabled={isPaused}
                >
                  Next Question
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={micEnabled ? "default" : "outline"}
                    onClick={() => setMicEnabled(!micEnabled)}
                    className="w-full"
                  >
                    {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant={cameraEnabled ? "default" : "outline"}
                    onClick={() => setCameraEnabled(!cameraEnabled)}
                    className="w-full"
                  >
                    {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-white/10 backdrop-blur-sm border-gray-600">
              <CardHeader>
                <CardTitle className="text-white">Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• Take 2-3 seconds to think before answering</li>
                  <li>• Use the STAR method for behavioral questions</li>
                  <li>• Maintain good posture and eye contact</li>
                  <li>• Speak clearly and at moderate pace</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSimulation;
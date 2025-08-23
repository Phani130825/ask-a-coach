import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Clock, 
  Star,
  Award,
  Target,
  Download,
  Play,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown
} from "lucide-react";

const PerformanceAnalytics = () => {
  const [selectedMetric, setSelectedMetric] = useState<'overall' | 'content' | 'nonverbal'>('overall');

  const overallScores = {
    overall: 87,
    content: 82,
    nonverbal: 91,
    confidence: 89
  };

  const contentAnalysis = [
    {
      question: "Tell me about yourself",
      score: 85,
      feedback: "Good structure, could expand on achievements",
      keywords: 8,
      clarity: 90,
      completeness: 80
    },
    {
      question: "Describe a challenging situation",
      score: 78,
      feedback: "Used STAR method well, add more specific metrics",
      keywords: 6,
      clarity: 85,
      completeness: 75
    },
    {
      question: "Where do you see yourself in 5 years?",
      score: 88,
      feedback: "Excellent alignment with role, very specific goals",
      keywords: 10,
      clarity: 95,
      completeness: 85
    }
  ];

  const nonverbalMetrics = {
    eyeContact: 92,
    posture: 88,
    gestures: 85,
    facialExpressions: 94,
    voiceConfidence: 89
  };

  const improvements = [
    {
      type: "Content",
      suggestion: "Include more quantifiable achievements in your responses",
      priority: "high",
      impact: "+5-8 points"
    },
    {
      type: "Non-verbal",
      suggestion: "Increase hand gestures to appear more engaging",
      priority: "medium", 
      impact: "+3-5 points"
    },
    {
      type: "Pacing",
      suggestion: "Slow down speech slightly for better clarity",
      priority: "low",
      impact: "+2-3 points"
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-green-50 border-green-200";
    if (score >= 80) return "bg-blue-50 border-blue-200";
    if (score >= 70) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Performance Analytics
              </h1>
              <p className="text-gray-600">
                Comprehensive analysis of your interview performance
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="professional">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake Interview
              </Button>
            </div>
          </div>
        </div>

        {/* Overall Score Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className={`p-6 ${getScoreBg(overallScores.overall)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(overallScores.overall)}`}>
                  {overallScores.overall}
                </p>
              </div>
              <Award className={`h-8 w-8 ${getScoreColor(overallScores.overall)}`} />
            </div>
            <div className="mt-4">
              <Progress value={overallScores.overall} className="h-2" />
            </div>
          </Card>

          <Card className={`p-6 ${getScoreBg(overallScores.content)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Content Quality</p>
                <p className={`text-3xl font-bold ${getScoreColor(overallScores.content)}`}>
                  {overallScores.content}
                </p>
              </div>
              <MessageSquare className={`h-8 w-8 ${getScoreColor(overallScores.content)}`} />
            </div>
            <div className="mt-4">
              <Progress value={overallScores.content} className="h-2" />
            </div>
          </Card>

          <Card className={`p-6 ${getScoreBg(overallScores.nonverbal)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Non-verbal</p>
                <p className={`text-3xl font-bold ${getScoreColor(overallScores.nonverbal)}`}>
                  {overallScores.nonverbal}
                </p>
              </div>
              <Eye className={`h-8 w-8 ${getScoreColor(overallScores.nonverbal)}`} />
            </div>
            <div className="mt-4">
              <Progress value={overallScores.nonverbal} className="h-2" />
            </div>
          </Card>

          <Card className={`p-6 ${getScoreBg(overallScores.confidence)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confidence Level</p>
                <p className={`text-3xl font-bold ${getScoreColor(overallScores.confidence)}`}>
                  {overallScores.confidence}
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${getScoreColor(overallScores.confidence)}`} />
            </div>
            <div className="mt-4">
              <Progress value={overallScores.confidence} className="h-2" />
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detailed Analysis Tabs */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content">Content Analysis</TabsTrigger>
                    <TabsTrigger value="nonverbal">Non-verbal Cues</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="content" className="space-y-4 mt-6">
                    {contentAnalysis.map((item, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{item.question}</h4>
                          <Badge className={`${getScoreColor(item.score)} bg-transparent border-current`}>
                            {item.score}/100
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{item.feedback}</p>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">{item.keywords}</div>
                            <div className="text-xs text-gray-500">Keywords Used</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">{item.clarity}%</div>
                            <div className="text-xs text-gray-500">Clarity</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">{item.completeness}%</div>
                            <div className="text-xs text-gray-500">Completeness</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="nonverbal" className="space-y-4 mt-6">
                    {Object.entries(nonverbalMetrics).map(([metric, score]) => (
                      <div key={metric} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${score >= 90 ? 'bg-green-500' : score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                          <span className="font-medium capitalize">
                            {metric.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={score} className="w-24 h-2" />
                          <span className={`font-semibold ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="mt-6">
                    <div className="space-y-4">
                      <div className="p-4 border-l-4 border-green-500 bg-green-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Strong Opening</span>
                          <span className="text-sm text-gray-500">0:00 - 2:30</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Confident introduction with good eye contact
                        </p>
                      </div>
                      
                      <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Needs Improvement</span>
                          <span className="text-sm text-gray-500">8:15 - 12:00</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Fidgeting increased, maintain composure
                        </p>
                      </div>
                      
                      <div className="p-4 border-l-4 border-green-500 bg-green-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Excellent Recovery</span>
                          <span className="text-sm text-gray-500">18:30 - 22:45</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Technical question answered with confidence
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Video Playback */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Playback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-xl relative overflow-hidden mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="opacity-75">Click to review your interview</p>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Progress value={35} className="flex-1 h-2" />
                        <span className="text-white text-sm">08:30 / 24:15</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="professional" size="sm">
                    Skip to Key Moments
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Recording
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Strengths</span>
                  </div>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Excellent technical knowledge</li>
                    <li>• Strong communication skills</li>
                    <li>• Good eye contact throughout</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Areas to Improve</span>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Add more specific examples</li>
                    <li>• Reduce filler words</li>
                    <li>• Improve posture consistency</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Improvement Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle>Improvement Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {improvements.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={item.priority === 'high' ? 'default' : 'secondary'}>
                        {item.priority} priority
                      </Badge>
                      <span className="text-sm font-medium text-green-600">
                        {item.impact}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{item.type}</h4>
                    <p className="text-sm text-gray-600">{item.suggestion}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="hero" className="w-full">
                  <Target className="h-4 w-4 mr-2" />
                  Practice Problem Areas
                </Button>
                <Button variant="professional" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Compare with Previous
                </Button>
                <Button variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Take New Interview
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
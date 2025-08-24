import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Eye, 
  Sparkles, 
  Crown, 
  CheckCircle, 
  Plus,
  ArrowRight
} from "lucide-react";

type ResumeTailoringProps = {
  resumeId?: string;
  onStartInterview?: (interviewId: string) => void;
};

const ResumeTailoring = ({ resumeId, onStartInterview }: ResumeTailoringProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [improvementsMade, setImprovementsMade] = useState(false);

  const templates = [
    { id: 1, name: "Professional", type: "free", preview: "/api/placeholder/200/280" },
    { id: 2, name: "Modern", type: "free", preview: "/api/placeholder/200/280" },
    { id: 3, name: "Executive", type: "premium", preview: "/api/placeholder/200/280" },
    { id: 4, name: "Tech", type: "free", preview: "/api/placeholder/200/280" },
    { id: 5, name: "Creative", type: "premium", preview: "/api/placeholder/200/280" },
  ];

  const improvements = [
    {
      type: "Skills Enhancement",
      description: "Added 5 relevant keywords from job description",
      impact: "high",
      applied: true
    },
    {
      type: "Experience Optimization",
      description: "Reworded achievements to match job requirements",
      impact: "high", 
      applied: true
    },
    {
      type: "Summary Refinement",
      description: "Enhanced professional summary with target role focus",
      impact: "medium",
      applied: false
    },
    {
      type: "Format Enhancement",
      description: "Improved ATS readability and structure",
      impact: "medium",
      applied: true
    }
  ];

  const applyImprovement = (index: number) => {
    setImprovementsMade(true);
    // In real app, this would apply the improvement
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Resume Tailoring
          </h1>
          <p className="text-gray-600">
            Optimize your resume with AI-powered suggestions and professional templates
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI Improvements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-primary" />
                  AI Improvements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {improvements.map((improvement, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border transition-all ${
                      improvement.applied 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200 hover:border-brand-primary/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {improvement.type}
                      </h4>
                      <Badge 
                        variant={improvement.impact === 'high' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {improvement.impact} impact
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {improvement.description}
                    </p>
                    {improvement.applied ? (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Applied
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="professional"
                        onClick={() => applyImprovement(index)}
                        className="w-full"
                      >
                        Apply Suggestion
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Resume Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`relative cursor-pointer rounded-xl border-2 transition-all ${
                        selectedTemplate === template.id
                          ? 'border-brand-primary shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                        <div className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-500" />
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{template.name}</span>
                          {template.type === 'premium' && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </div>
                      {template.type === 'premium' && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-yellow-500 text-white text-xs">
                            Premium
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  View All Templates
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                        <CardTitle>Resume Preview</CardTitle>
                        {resumeId && <div className="text-sm text-gray-500">Resume ID: {resumeId}</div>}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="professional" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="optimized" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="optimized">AI Optimized</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="original" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-8 min-h-[600px] shadow-sm">
                      <div className="space-y-6">
                        <div className="text-center border-b pb-4">
                          <h2 className="text-2xl font-bold text-gray-900">Sarah Johnson</h2>
                          <p className="text-gray-600">Software Engineer</p>
                          <p className="text-sm text-gray-500">sarah@email.com | (555) 123-4567</p>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Experience</h3>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">Senior Developer</h4>
                              <p className="text-sm text-gray-600">TechCorp Inc. | 2020 - Present</p>
                              <ul className="text-sm text-gray-600 ml-4 mt-1">
                                <li>• Developed web applications</li>
                                <li>• Worked with teams</li>
                                <li>• Improved system performance</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills</h3>
                          <p className="text-sm text-gray-600">JavaScript, React, Node.js, Python</p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="optimized" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-brand-primary p-8 min-h-[600px] shadow-lg relative overflow-hidden">
                      {improvementsMade && (
                        <div className="absolute top-4 right-4 z-10">
                          <Badge className="bg-green-500 text-white animate-pulse">
                            Optimized
                          </Badge>
                        </div>
                      )}
                      
                      <div className="space-y-6">
                        <div className="text-center border-b pb-4">
                          <h2 className="text-2xl font-bold text-gray-900">Sarah Johnson</h2>
                          <p className="text-gray-600 font-medium">Senior Full-Stack Software Engineer</p>
                          <p className="text-sm text-gray-500">sarah@email.com | (555) 123-4567 | LinkedIn: sarah-johnson</p>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Summary</h3>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            Experienced Full-Stack Software Engineer with 4+ years developing scalable web applications using React, Node.js, and Python. 
                            Proven track record of improving system performance by 40% and leading cross-functional teams to deliver high-quality software solutions.
                          </p>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Experience</h3>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">Senior Full-Stack Developer</h4>
                              <p className="text-sm text-gray-600">TechCorp Inc. | 2020 - Present</p>
                              <ul className="text-sm text-gray-600 ml-4 mt-1 space-y-1">
                                <li>• Architected and developed 15+ responsive web applications using React, TypeScript, and Node.js</li>
                                <li>• Led cross-functional team of 5 developers, implementing Agile methodologies to improve delivery speed by 30%</li>
                                <li>• Optimized database queries and API endpoints, resulting in 40% improvement in application performance</li>
                                <li>• Mentored junior developers and conducted code reviews to maintain high code quality standards</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Technical Skills</h3>
                          <div className="text-sm text-gray-600">
                            <p><strong>Languages:</strong> JavaScript (ES6+), TypeScript, Python, SQL</p>
                            <p><strong>Frontend:</strong> React, Redux, HTML5, CSS3, Tailwind CSS</p>
                            <p><strong>Backend:</strong> Node.js, Express.js, RESTful APIs, GraphQL</p>
                            <p><strong>Databases:</strong> PostgreSQL, MongoDB, Redis</p>
                            <p><strong>Tools:</strong> Git, Docker, AWS, Jenkins, Jest</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="outline" size="lg">
            Back to Upload
          </Button>
          <Button
            variant="hero"
            size="lg"
            className="px-8"
            onClick={async () => {
              if (onStartInterview && resumeId) {
                try {
                  // create a short interview (5 questions, 5 minutes)
                  const created = await (await import("@/services/api")).interviewAPI.create({ resumeId, jobDescription: 'Quick practice', interviewType: 'technical', settings: { questionCount: 5, timeLimit: 5 } });
                  const interviewId = created?.data?.data?.interview?.id || created?.data?.interview?.id;
                  if (interviewId) onStartInterview(interviewId);
                  return;
                } catch (err) {
                  console.error('Create interview failed', err);
                }
              }
            }}
          >
            Proceed to Interview Simulation
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResumeTailoring;
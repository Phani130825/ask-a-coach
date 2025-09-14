import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Play,
  BarChart3,
  Settings,
  Calendar,
  Trophy,
  Clock,
  Target,
  FileText,
  Video
} from "lucide-react";
import pipelineLib from '@/lib/pipeline';
import { useAuth } from '@/contexts/AuthContext';

function PipelineStatus({ onNavigate }: { onNavigate: (view: any) => void }) {
  const [pipeline, setPipeline] = useState(() => {
    try { return pipelineLib.getCurrentPipeline(); } catch(e) { return null; }
  });

  useEffect(() => {
    const onStorage = () => setPipeline(pipelineLib.getCurrentPipeline());
    window.addEventListener('storage', onStorage);
    const interval = setInterval(() => setPipeline(pipelineLib.getCurrentPipeline()), 1000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(interval); };
  }, []);

  if (!pipeline) {
    return (
      <div className="p-4 border rounded-xl text-sm text-gray-600">No active pipeline. Create one to begin.</div>
    );
  }

  const stages = Object.keys(pipeline.stages || {});

  return (
    <div className="p-4 border rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-semibold">Pipeline: {pipeline.type}</div>
          <div className="text-xs text-gray-500">Created: {new Date(pipeline.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <Button variant="ghost" size="sm" onClick={() => { pipelineLib.clearPipeline(); setPipeline(null); }}>Clear</Button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {stages.map((s) => (
          <button key={s} aria-label={`Pipeline stage ${s}`} onClick={() => {
            // Clicking jumps to the appropriate view and preserves resumeId
            if (pipeline?.resumeId) {
              try { window.localStorage.setItem('navResumeId', pipeline.resumeId); } catch(e) { }
            }
            switch (s) {
              case 'uploaded': return onNavigate('upload');
              case 'tailored': return onNavigate('tailoring');
              case 'interview': return onNavigate('interview');
              case 'analytics': return onNavigate('analytics');
              default: return;
            }
          }} className={`p-2 rounded-xl text-center w-full text-left ${pipeline.stages[s] ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="text-sm font-medium">{s}</div>
            <div className="text-xs text-gray-500">{pipeline.stages[s] ? 'Done' : 'Pending'}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface DashboardProps {
  onNavigate: (view: 'landing' | 'dashboard' | 'upload' | 'tailoring' | 'aptitude' | 'coding' | 'interview' | 'analytics' | 'schedule' | 'settings' | 'pipelines') => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { user } = useAuth();

  const modules = [
    {
      id: 1,
      title: "Resume & Job Upload",
      description: "Upload your resume and target job description for AI analysis",
      icon: <Upload className="h-8 w-8" />,
      status: "ready",
      progress: 0,
      estimatedTime: "5 min"
    },
    {
      id: 2,
      title: "Resume Tailoring",
      description: "AI-powered optimization matching your experience to job requirements",
      icon: <FileText className="h-8 w-8" />,
      status: "locked",
      progress: 0,
      estimatedTime: "10 min"
    },
    {
      id: 3,
      title: "Interview Simulation",
      description: "Practice with AI interviewer in HR, Managerial, or Technical scenarios",
      icon: <Video className="h-8 w-8" />,
      status: "locked",
      progress: 0,
      estimatedTime: "30 min"
    },
    {
      id: 4,
      title: "Performance Analytics",
      description: "Comprehensive feedback on verbal and non-verbal communication",
      icon: <BarChart3 className="h-8 w-8" />,
      status: "locked",
      progress: 0,
      estimatedTime: "Review"
    }
  ];

  const recentSessions = [
    {
      type: "Technical Interview",
      company: "TechCorp Inc.",
      score: 87,
      date: "2 days ago",
      duration: "28 min"
    },
    {
      type: "HR Interview",
      company: "StartupXYZ",
      score: 92,
      date: "5 days ago",
      duration: "25 min"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getButtonVariant = (status: string) => {
    switch (status) {
      case 'ready': return 'hero';
      case 'completed': return 'professional';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'User'}! 👋
          </h1>
          <p className="text-gray-600">
            Continue your interview preparation journey
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Success Rate</p>
                <p className="text-2xl font-bold">94%</p>
              </div>
              <Trophy className="h-8 w-8 text-green-200" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Interviews Completed</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Target className="h-8 w-8 text-blue-200" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Practice Hours</p>
                <p className="text-2xl font-bold">8.5</p>
              </div>
              <Clock className="h-8 w-8 text-purple-200" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Avg Score</p>
                <p className="text-2xl font-bold">89</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-200" />
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pipelines */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Pipelines</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="hero" onClick={() => {
                    pipelineLib.createPipeline('tailoring');
                    // go to upload first so user can upload and preview before tailoring
                    onNavigate('upload');
                  }}>New Resume Tailoring</Button>
                  <Button variant="professional" onClick={() => { 
                    pipelineLib.createPipeline('interview');
                    onNavigate('upload');
                  }}>New Interview</Button>
                </div>
                <div className="pt-4">
                  {/* Current pipeline status */}
                  <PipelineStatus onNavigate={onNavigate} />
                </div>
              </div>
            </Card>

            {/* Separate Access - All Modules */}
            {user && (
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Separate Access</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                  <div className="p-6 border rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Resume Tailoring</h3>
                        <p className="text-sm text-gray-600">AI-powered optimization matching your experience to job requirements</p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => onNavigate('tailoring')}
                    >
                      Access Resume Tailoring
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Target className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Aptitude Test</h3>
                        <p className="text-sm text-gray-600">Test your logical and quantitative skills with AI-generated questions</p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => onNavigate('aptitude')}
                    >
                      Access Aptitude Test
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-orange-50 to-orange-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Coding Round</h3>
                        <p className="text-sm text-gray-600">Practice coding problems and algorithms for technical interviews</p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => onNavigate('coding')}
                    >
                      Access Coding Round
                    </Button>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-r from-green-50 to-green-100/50">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <Video className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Interview Simulation</h3>
                        <p className="text-sm text-gray-600">Practice with AI interviewer in HR, Managerial, or Technical scenarios</p>
                      </div>
                    </div>
                    <Button
                      variant="professional"
                      className="w-full"
                      onClick={() => onNavigate('interview')}
                    >
                      Access Interview Simulation
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate('schedule')}
                >
                  <Calendar className="h-6 w-6" />
                  <span>Schedule Practice</span>
                </Button>
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate('interview')}
                >
                  <Play className="h-6 w-6" />
                  <span>Quick Interview</span>
                </Button>
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate('settings')}
                >
                  <Settings className="h-6 w-6" />
                  <span>Settings</span>
                </Button>
                <Button
                  variant="professional"
                  className="h-auto p-6 flex-col gap-3"
                  onClick={() => onNavigate('pipelines')}
                >
                  <FileText className="h-6 w-6" />
                  <span>Pipeline Dashboard</span>
                </Button>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Sessions */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Recent Sessions</h3>
              <div className="space-y-4">
                {recentSessions.map((session, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{session.type}</h4>
                      <span className="text-2xl font-bold text-brand-primary">{session.score}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{session.company}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{session.date}</span>
                      <span>{session.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4">
                View All Sessions
              </Button>
            </Card>

            {/* Progress Overview */}
            <Card className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Overall Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Interview Skills</span>
                    <span>89%</span>
                  </div>
                  <Progress value={89} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Confidence Level</span>
                    <span>76%</span>
                  </div>
                  <Progress value={76} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Technical Knowledge</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
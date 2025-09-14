import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Dashboard from "@/components/Dashboard";
import ResumeUpload from "@/components/ResumeUpload";
import ResumeTailoring from "@/components/ResumeTailoring";
import Aptitude from "@/components/Aptitude";
import CodingRound from "@/components/CodingRound";
import InterviewSimulation from "@/components/InterviewSimulation";
import PerformanceAnalytics from "@/components/PerformanceAnalytics";
import SchedulePractice from "@/components/SchedulePractice";
import Settings from "@/components/Settings";
import Login from "@/components/Login";
import Register from "@/components/Register";
import PipelineDashboard from "@/components/PipelineDashboard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type AppView = 'landing' | 'dashboard' | 'upload' | 'tailoring' | 'aptitude' | 'coding' | 'interview' | 'analytics' | 'schedule' | 'settings' | 'login' | 'register' | 'pipelines';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const { isAuthenticated, isLoading } = useAuth();

  // Listen for cross-component navigation intents via localStorage
  useEffect(() => {
    const applyNav = () => {
      try {
        const nav = window.localStorage.getItem('navigateTo');
        if (nav) {
          window.localStorage.removeItem('navigateTo');
          setCurrentView(nav as AppView);
        }
      } catch (e) { /* ignore */ }
    };
    applyNav();
    const handler = (e: StorageEvent) => {
      if (e.key === 'navigateTo' && e.newValue) {
        setCurrentView(e.newValue as AppView);
        try { window.localStorage.removeItem('navigateTo'); } catch (err) { /* ignore */ }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Handle authentication state changes - only redirect to dashboard if no pending navigation
  useEffect(() => {
    if (!isLoading && isAuthenticated && (currentView === 'login' || currentView === 'register' || currentView === 'landing')) {
      // Check if there's a pending navigation before redirecting to dashboard
      const pendingNav = window.localStorage.getItem('navigateTo');
      if (!pendingNav) {
        setCurrentView('dashboard');
      }
    }
  }, [isAuthenticated, isLoading, currentView]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'login':
        return <Login onSwitchToRegister={() => setCurrentView('register')} />;
      case 'register':
        return <Register onSwitchToLogin={() => setCurrentView('login')} />;
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'upload': {
        // pick up resumeId handed via localStorage if present
        const navId = typeof window !== 'undefined' ? window.localStorage.getItem('navResumeId') : null;
        if (navId && !activeResumeId) setActiveResumeId(navId);
        return (
          <ResumeUpload
            onUploaded={(id: string) => {
              setActiveResumeId(id);
              setCurrentView('tailoring');
            }}
            onStartInterview={(interviewId: string) => {
              setActiveInterviewId(interviewId);
              setCurrentView('interview');
            }}
          />
        );
      }
      case 'tailoring': {
        // pick up resumeId from localStorage if present (handoff from upload/dashboard)
        const navId = typeof window !== 'undefined' ? window.localStorage.getItem('navResumeId') : null;
        if (navId && !activeResumeId) setActiveResumeId(navId);
        return (
          <ResumeTailoring
            resumeId={activeResumeId ?? undefined}
            onStartInterview={() => {
              setCurrentView('interview');
            }}
          />
        );
      }
      case 'aptitude': {
        // pick up resumeId from localStorage if present
        const navId = typeof window !== 'undefined' ? window.localStorage.getItem('navResumeId') : null;
        if (navId && !activeResumeId) setActiveResumeId(navId);
        return (
          <Aptitude
            onProceed={() => {
              setCurrentView('coding');
            }}
          />
        );
      }
      case 'coding': {
        // pick up resumeId from localStorage if present
        const navId = typeof window !== 'undefined' ? window.localStorage.getItem('navResumeId') : null;
        if (navId && !activeResumeId) setActiveResumeId(navId);
        return (
          <CodingRound
            onProceed={() => {
              setCurrentView('interview');
            }}
          />
        );
      }
      case 'interview': {
        // pick up interviewId from localStorage if present
        const navId = typeof window !== 'undefined' ? window.localStorage.getItem('navInterviewId') : null;
        if (navId && !activeInterviewId) setActiveInterviewId(navId);
        return (
          <InterviewSimulation
            interviewId={activeInterviewId ?? undefined}
            onComplete={(id?: string) => {
              // after interview complete, show analytics
              setActiveInterviewId(id ?? null);
              setCurrentView('analytics');
            }}
          />
        );
      }
      case 'schedule':
        return <SchedulePractice onStart={() => setCurrentView('interview')} />;
      case 'settings':
        return <Settings />;
      case 'analytics':
        return <PerformanceAnalytics />;
      case 'pipelines':
        return <PipelineDashboard />;
      default:
        return (
          <div className="min-h-screen bg-white">
            <Hero onNavigate={setCurrentView} />
            <Features />
            
            {/* Demo Dashboard Section */}
            <section className="py-20 bg-gray-900 text-white">
              <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                  <h2 className="text-4xl font-bold mb-6">
                    Experience the Complete Platform
                  </h2>
                  <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                    Get a full preview of our AI-powered interview preparation system. 
                    Experience each module and see how they work together to transform your interview skills.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={() => setCurrentView('dashboard')}
                    className="h-auto p-6 flex-col gap-3 text-center"
                  >
                    <div className="text-2xl">📊</div>
                    <div>
                      <div className="font-semibold">Dashboard</div>
                      <div className="text-sm opacity-75">Overview & Progress</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="professional"
                    size="lg"
                    onClick={() => setCurrentView('upload')}
                    className="h-auto p-6 flex-col gap-3 text-center"
                  >
                    <div className="text-2xl">📄</div>
                    <div>
                      <div className="font-semibold">Resume Upload</div>
                      <div className="text-sm opacity-75">Upload & Analysis</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="professional"
                    size="lg"
                    onClick={() => setCurrentView('tailoring')}
                    className="h-auto p-6 flex-col gap-3 text-center"
                  >
                    <div className="text-2xl">✨</div>
                    <div>
                      <div className="font-semibold">AI Tailoring</div>
                      <div className="text-sm opacity-75">Smart Optimization</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="professional"
                    size="lg"
                    onClick={() => setCurrentView('interview')}
                    className="h-auto p-6 flex-col gap-3 text-center"
                  >
                    <div className="text-2xl">🎥</div>
                    <div>
                      <div className="font-semibold">Interview Sim</div>
                      <div className="text-sm opacity-75">Practice Sessions</div>
                    </div>
                  </Button>
                </div>
                
                <div className="text-center mt-8">
                  <Button
                    variant="premium"
                    size="lg"
                    onClick={() => setCurrentView('analytics')}
                    className="px-8 py-4 text-lg"
                  >
                    <div className="text-xl mr-2">📈</div>
                    View Performance Analytics
                  </Button>
                </div>
              </div>
            </section>
            
            {/* Footer */}
            <footer className="bg-gray-50 py-12">
              <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-4">InterviewAI</h3>
                    <p className="text-gray-600 text-sm">
                      Professional interview preparation powered by artificial intelligence.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Features</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>AI Resume Tailoring</li>
                      <li>Interview Simulation</li>
                      <li>Performance Analytics</li>
                      <li>Professional Templates</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>About Us</li>
                      <li>Pricing</li>
                      <li>Contact</li>
                      <li>Support</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>Interview Tips</li>
                      <li>Resume Guide</li>
                      <li>Career Advice</li>
                      <li>Success Stories</li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-600">
                  © 2024 InterviewAI. All rights reserved.
                </div>
              </div>
            </footer>
          </div>
        );
    }
  };

  // Add navigation helper for non-landing views
  // Back button removed per UX request

  return (
    <div className="relative">
  <Header onNavigate={setCurrentView} />
  <div className="pt-20">
    {renderCurrentView()}
  </div>
    </div>
  );
};

export default Index;

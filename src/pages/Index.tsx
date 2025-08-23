import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Dashboard from "@/components/Dashboard";
import ResumeUpload from "@/components/ResumeUpload";
import ResumeTailoring from "@/components/ResumeTailoring";
import InterviewSimulation from "@/components/InterviewSimulation";
import PerformanceAnalytics from "@/components/PerformanceAnalytics";
import { Button } from "@/components/ui/button";

type AppView = 'landing' | 'dashboard' | 'upload' | 'tailoring' | 'interview' | 'analytics';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return <ResumeUpload />;
      case 'tailoring':
        return <ResumeTailoring />;
      case 'interview':
        return <InterviewSimulation />;
      case 'analytics':
        return <PerformanceAnalytics />;
      default:
        return (
          <div className="min-h-screen bg-white">
            <Header />
            <Hero />
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
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
  const showBackButton = currentView !== 'landing';

  return (
    <div className="relative">
      {showBackButton && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            onClick={() => setCurrentView('landing')}
            className="bg-white/90 backdrop-blur-sm"
          >
            ← Back to Home
          </Button>
        </div>
      )}
      
      {renderCurrentView()}
    </div>
  );
};

export default Index;
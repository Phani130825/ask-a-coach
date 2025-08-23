import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Dashboard from "@/components/Dashboard";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showDashboard, setShowDashboard] = useState(false);

  if (showDashboard) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      
      {/* Demo Dashboard Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Experience the Platform
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Get a preview of your personalized dashboard and see how our AI-powered modules work together to transform your interview skills.
          </p>
          <Button
            variant="hero"
            size="lg"
            onClick={() => setShowDashboard(true)}
            className="text-lg px-8 py-4"
          >
            View Demo Dashboard
          </Button>
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
};

export default Index;

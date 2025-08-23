import { Button } from "@/components/ui/button";
import { Brain, Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-xl">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">InterviewAI</h1>
              <p className="text-xs text-gray-600">Professional Prep</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-700 hover:text-brand-primary transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-700 hover:text-brand-primary transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-gray-700 hover:text-brand-primary transition-colors">
              About
            </a>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button variant="hero" size="lg">Get Started</Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-700"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-200">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-gray-700 py-2">Features</a>
              <a href="#pricing" className="text-gray-700 py-2">Pricing</a>
              <a href="#about" className="text-gray-700 py-2">About</a>
              <div className="flex flex-col gap-3 mt-4">
                <Button variant="ghost">Sign In</Button>
                <Button variant="hero">Get Started</Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
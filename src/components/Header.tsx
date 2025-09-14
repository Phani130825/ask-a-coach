import { Button } from "@/components/ui/button";
import { Brain, Menu, X, User, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type HeaderProps = {
  onNavigate?: (view: 'landing' | 'dashboard' | 'upload' | 'tailoring' | 'interview' | 'analytics' | 'schedule' | 'settings' | 'login' | 'register') => void;
};

const Header = ({ onNavigate }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

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

          {/* Desktop Navigation - only visible when authenticated */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => onNavigate?.('dashboard')} className="text-gray-700 hover:text-brand-primary transition-colors">Dashboard</button>
              <button onClick={() => onNavigate?.('analytics')} className="text-gray-700 hover:text-brand-primary transition-colors">Overall Analytics</button>
            </nav>
          )}

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span>{user?.firstName} {user?.lastName}</span>
                </div>
                <Button variant="ghost" onClick={async () => { await logout(); onNavigate?.('landing'); }} size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={() => onNavigate?.('login')}>Sign In</Button>
                <Button variant="hero" size="lg" onClick={() => onNavigate?.('register')}>Get Started</Button>
              </>
            )}
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
              {/* Only show module links on mobile when authenticated */}
              {isAuthenticated ? (
                <>
                  <button onClick={() => { onNavigate?.('dashboard'); setIsMenuOpen(false); }} className="text-gray-700 py-2 text-left">Dashboard</button>
                  <button onClick={() => { onNavigate?.('analytics'); setIsMenuOpen(false); }} className="text-gray-700 py-2 text-left">Overall Analytics</button>
                  <div className="flex flex-col gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700 py-2">
                      <User className="h-4 w-4" />
                      <span>{user?.firstName} {user?.lastName}</span>
                    </div>
                    <Button variant="ghost" onClick={async () => { await logout(); onNavigate?.('landing'); setIsMenuOpen(false); }}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-3 mt-4">
                    <Button variant="ghost" onClick={() => { onNavigate?.('login'); setIsMenuOpen(false); }}>Sign In</Button>
                    <Button variant="hero" onClick={() => { onNavigate?.('register'); setIsMenuOpen(false); }}>Get Started</Button>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
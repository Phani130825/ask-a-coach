import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Video, 
  BarChart3, 
  Brain, 
  Target, 
  Award,
  Sparkles,
  Clock
} from "lucide-react";
import resumeIcon from "@/assets/resume-icon.jpg";
import interviewIcon from "@/assets/interview-icon.jpg";

const Features = () => {
  const features = [
    {
      icon: <FileText className="h-8 w-8" />,
      title: "AI Resume Tailoring",
      description: "Smart optimization that matches your experience with job requirements, highlighting the most relevant skills and achievements.",
      image: resumeIcon,
      features: ["25+ Professional Templates", "ATS-Friendly Formats", "Keyword Optimization"],
      premium: false
    },
    {
      icon: <Video className="h-8 w-8" />,
      title: "Interview Simulation",
      description: "Practice with realistic AI-powered interviews for HR, Managerial, and Technical roles with real-time feedback.",
      image: interviewIcon,
      features: ["3 Interview Types", "Real-time Analysis", "30-Minute Sessions"],
      premium: false
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Performance Analytics",
      description: "Comprehensive analysis of your verbal and non-verbal communication with actionable improvement suggestions.",
      image: null,
      features: ["Confidence Scoring", "Content Analysis", "Non-verbal Tracking"],
      premium: true
    }
  ];

  const benefits = [
    {
      icon: <Target className="h-6 w-6" />,
      title: "95% Success Rate",
      description: "Users report significantly improved interview performance"
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "30-Minute Sessions",
      description: "Efficient practice sessions that fit your schedule"
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Professional Templates",
      description: "Access to premium, ATS-optimized resume designs"
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI-Powered Insights",
      description: "Advanced analytics to identify improvement areas"
    }
  ];

  return (
    <section id="features" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 slide-in-up">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Everything You Need to
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              {" "}Ace Your Interview
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            Our comprehensive platform combines AI technology with professional expertise 
            to give you the competitive edge in your job search.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative feature-card group fade-in-delayed"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              {feature.premium && (
                <div className="absolute -top-3 -right-3 z-10">
                  <span className="premium-badge">Premium</span>
                </div>
              )}
              
              <div className="relative">
                {feature.image && (
                  <div className="mb-6 relative overflow-hidden rounded-xl">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      {feature.icon}
                    </div>
                  </div>
                )}
                
                {!feature.image && (
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center text-white mb-4">
                      {feature.icon}
                    </div>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                
                <ul className="space-y-2 mb-6">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-gray-700">
                      <div className="w-2 h-2 bg-brand-primary rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant={feature.premium ? "premium" : "professional"} 
                  className="w-full"
                >
                  {feature.premium ? "Upgrade to Access" : "Try Now"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Grid */}
        <div className="bg-white rounded-3xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Why Choose InterviewAI?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary mx-auto mb-4">
                  {benefit.icon}
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{benefit.title}</h4>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
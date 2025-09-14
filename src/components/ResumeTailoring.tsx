import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Download,
  Eye,
  Sparkles,
  Crown,
  CheckCircle,
  Plus,
  ArrowRight,
  Loader,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import api, { resumeAPI } from '@/services/api';
import pipelineLib from '@/lib/pipeline';
import { useAuth } from "@/contexts/AuthContext";

type ResumeTailoringProps = {
  resumeId?: string;
  onStartInterview?: (interviewId?: string) => void;
};

const ResumeTailoring = ({ resumeId, onStartInterview }: ResumeTailoringProps) => {
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [tailoredVersions, setTailoredVersions] = useState<any[]>([]);
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(1);
  const [improvementsMade, setImprovementsMade] = useState(false);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isTailoring, setIsTailoring] = useState<boolean>(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState<boolean>(false);
  const [resumeText, setResumeText] = useState<string>('');
  const [latexContent, setLatexContent] = useState<string>('');
  const [isGeneratingLatex, setIsGeneratingLatex] = useState<boolean>(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [optimizedText, setOptimizedText] = useState<string>('');

  const [templates, setTemplates] = useState<any[]>([]);
  const currentPipeline = pipelineLib.getCurrentPipeline();

  const formatParsedData = (pd: any, originalText?: string) => {
    if (originalText) return originalText;
    if (!pd) return '';
    if (typeof pd === 'string') return pd;

    // Prioritize fullText if available (contains the complete original resume text)
    if (pd.fullText && pd.fullText.trim()) {
      return pd.fullText;
    }

    // Fallback to reconstructing from parsed data parts
    const parts: string[] = [];
    if (pd.personalInfo) {
      const p = pd.personalInfo;
      if (p.name) parts.push(p.name);
      if (p.email) parts.push(p.email);
      if (p.phone) parts.push(p.phone);
    }
    if (pd.summary) parts.push('\n' + pd.summary);
    if (pd.experience && Array.isArray(pd.experience) && pd.experience.length) {
      parts.push('\nExperience:');
      pd.experience.forEach((exp: any) => {
        parts.push(`- ${exp.title || ''} at ${exp.company || ''} ${exp.startDate ? '(' + new Date(exp.startDate).getFullYear() + ')' : ''}`);
        if (exp.description && Array.isArray(exp.description)) parts.push('  ' + exp.description.join('\n  '));
      });
    }
    if (pd.skills) {
      const tech = pd.skills.technical || pd.skills;
      if (tech && tech.length) parts.push('\nSkills:\n' + (Array.isArray(tech) ? tech.join(', ') : tech));
    }
    return parts.join('\n');
  };

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

  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    let mounted = true;

    const loadOnce = async () => {
      try {
        const res = await api.get(`/resumes/${resumeId}`, { params: { _ts: Date.now() } });
        const r = res?.data?.data?.resume;
        console.log('Frontend received resume data:', {
          hasOriginalText: !!r?.originalText,
          originalTextLength: r?.originalText?.length || 0,
          hasParsedData: !!r?.parsedData,
          parsedDataFullTextLength: r?.parsedData?.fullText?.length || 0,
          originalTextFirst100: r?.originalText?.substring(0, 100) || 'N/A'
        });
        if (r && mounted) {
          setParsedData(r.parsedData || null);
          setTailoredVersions(r.tailoredVersions || []);
          // Initialize resume text from parsed data or original text
          if (r.originalText) {
            // Use originalText as primary source (contains complete original text)
            console.log('Using originalText, length:', r.originalText.length);
            setResumeText(r.originalText);
          } else if (r.parsedData?.fullText) {
            // Use fullText if originalText is not available
            console.log('Using parsedData.fullText, length:', r.parsedData.fullText.length);
            setResumeText(r.parsedData.fullText);
          } else if (r.parsedData) {
            // Fallback to formatted parsed data
            const formattedText = formatParsedData(r.parsedData);
            console.log('Using formatted parsed data, length:', formattedText.length);
            setResumeText(formattedText);
          }
        }
      } catch (err) {
        console.error('Failed to load resume for tailoring', err);
      }
      try {
        const t = await resumeAPI.getTemplates(resumeId);
        const list = t?.data?.data?.templates || [];
        if (mounted) setTemplates(list);
      } catch (e) {
        /* ignore */
      }
    };

    const startPolling = () => {
      let attempts = 0;
      const maxAttempts = 30;
      const intervalMs = 2000;

      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      pollingRef.current = window.setInterval(async () => {
        attempts++;
        try {
          const res = await api.get(`/resumes/${resumeId}`, { params: { _ts: Date.now() } });
          const r = res?.data?.data?.resume;
          if (r && mounted) {
            setParsedData(r.parsedData || null);
            setTailoredVersions(r.tailoredVersions || []);
            const pd = r.parsedData;
            const hasText = r.originalText || (pd && (typeof pd === 'string' ? pd.trim().length > 0 : (pd.fullText || pd.summary)));
            if (hasText) {
              if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
            }
          }
        } catch (err) {
          /* ignore */
        }
        if (attempts >= maxAttempts) {
          if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
        }
      }, intervalMs);
    };

    loadOnce();
    startPolling();

    return () => { mounted = false; if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [resumeId]);

  const requestTemplatePreview = async (templateType: string) => {
    if (!resumeId || tailoredVersions.length === 0) return;
    const tv = tailoredVersions[tailoredVersions.length - 1];
    try {
      const res = await (await import('@/services/api')).resumeAPI.generateTemplate(resumeId, { templateType, tailoredVersionId: tv._id || tv.id });
      setTemplateHtml(res?.data?.data?.html || null);
    } catch (err) {
      console.error('Generate template failed', err);
      setTemplateHtml(null);
    }
  };

  const generateLatexResume = async () => {
    if (!resumeId || tailoredVersions.length === 0) return;
    const tv = tailoredVersions[tailoredVersions.length - 1];
    setIsGeneratingLatex(true);
    try {
      // Use optimized text if available, otherwise use tailored content
      const contentToUse = optimizedText || tv.tailoredContent;
      const res = await api.post(`/resumes/${resumeId}/generate-latex`, {
        tailoredVersionId: tv._id || tv.id,
        content: contentToUse
      });
      const latex = res?.data?.data?.latex || '';
      setLatexContent(latex);
    } catch (err) {
      console.error('LaTeX generation failed', err);
      setLatexContent('');
    } finally {
      setIsGeneratingLatex(false);
    }
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
            {/* Resume Text Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-primary" />
                  Resume Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-xl resize-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-colors"
                  placeholder="Your resume text will appear here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Edit your resume text here for tailoring
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!resumeId || !resumeText.trim()) return;
                      try {
                        // Update resume text via API using parseLocal endpoint
                        await resumeAPI.parseLocal(resumeId, { parsedText: resumeText });
                        alert('Resume text updated successfully');
                      } catch (error) {
                        console.error('Failed to update resume text', error);
                        alert('Failed to update resume text');
                      }
                    }}
                  >
                    Update Text
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Improvements: Tailor resume based on job description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-primary" />
                  AI Improvements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Job Description</label>
                  <textarea
                    className="mt-1 w-full h-32 p-3 border border-gray-300 rounded-lg focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    placeholder="Paste the job description here for tailoring"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                    <Button
                      className="mt-2 w-full"
                      variant="professional"
                      disabled={!resumeId || !jobDescription.trim() || isTailoring}
                        onClick={async () => {
                        if (!resumeId || !jobDescription.trim()) return;
                        setIsTailoring(true);
                        try {
                          // Call tailor API which now returns match score, suggestions, optimized text, and LaTeX
                          const res = await resumeAPI.tailor(resumeId, { jobDescription, templateType: 'professional' });
                          const data = res?.data?.data || {};

                          // Update new fields
                          setMatchScore(data.matchScore || null);
                          setSuggestions(data.suggestions || []);
                          setOptimizedText(data.optimizedText || '');
                          setLatexContent(data.latex || '');

                          setImprovementsMade(true);
                          // mark pipeline stage locally and attempt backend update
                          try { pipelineLib.updateStage('tailored', true); } catch (e) { /* ignore */ }

                        // Generate LaTeX content after tailoring if not already provided
                        if (!data.latex) {
                          setTimeout(() => {
                            generateLatexResume();
                          }, 1000);
                        }

                      } catch (e) {
                        console.error('Tailoring failed', e);
                      } finally {
                        setIsTailoring(false);
                      }
                    }}
                  >
                    {isTailoring ? 'Tailoring...' : 'Tailor Resume for this Job'}
                  </Button>
                </div>

                {/* Match Score Display */}
                {matchScore !== null && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">Resume Match Score</h4>
                      <span className="text-2xl font-bold text-blue-600">{matchScore}%</span>
                    </div>
                    <Progress value={matchScore} className="h-3" />
                    <p className="text-sm text-blue-700 mt-2">
                      {matchScore >= 80 ? 'Excellent match! Your resume aligns well with this job.' :
                       matchScore >= 60 ? 'Good match. Some improvements could help.' :
                       'Consider significant improvements to better match this role.'}
                    </p>
                  </div>
                )}

                {/* Keyword Highlights */}
                {parsedData?.aiAnalysis?.skillsMatch && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Keyword Analysis</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-green-700 mb-2">Matched Keywords</h5>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.aiAnalysis.skillsMatch.matchedSkills.slice(0, 10).map((keyword: string, index: number) => (
                            <Badge key={index} className="bg-green-100 text-green-800 border-green-200">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-red-700 mb-2">Missing Keywords</h5>
                        <div className="flex flex-wrap gap-2">
                          {parsedData.aiAnalysis.skillsMatch.missingSkills.slice(0, 10).map((keyword: string, index: number) => (
                            <Badge key={index} variant="outline" className="border-red-200 text-red-700">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestions Display */}
                {suggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">AI Suggestions for Improvement</h4>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-green-800">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                        {template.previewHtml ? (
                          <iframe title={template.name} className="w-full h-full" srcDoc={template.previewHtml} />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-500" />
                          </div>
                        )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!resumeId) return;
                        try {
                          const res = await api.get(`/resumes/${resumeId}`, { params: { _ts: Date.now() } });
                          const r = res?.data?.data?.resume;
                          setParsedData(r?.parsedData || null);
                          setTailoredVersions(r?.tailoredVersions || []);
                        } catch (e) { /* ignore */ }
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button
                      variant="professional"
                      size="sm"
                      onClick={async () => {
                        if (!resumeId) return;
                        try {
                          // Download last generated template if available; otherwise prompt generation
                          const tv = tailoredVersions[tailoredVersions.length - 1];
                          if (!tv) return;
                          const htmlBlob = new Blob([(templateHtml || '')], { type: 'text/html' });
                          if (templateHtml) {
                            const url = URL.createObjectURL(htmlBlob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `resume-${resumeId}.html`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          } else {
                            // trigger server-side generation and then allow download
                            const res = await resumeAPI.generateTemplate(resumeId, { templateType: 'professional', tailoredVersionId: tv._id || tv.id });
                            const html = res?.data?.data?.html || '';
                            setTemplateHtml(html);
                            const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `resume-${resumeId}.html`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                          }
                          
                          // Finalize pipeline stage upon successful download
                          try {
                            // Ensure we have valid parsed text
                            const parsedText = parsedData?.fullText || 
                                             parsedData?.summary || 
                                             (parsedData?.personalInfo?.name ? `Resume for ${parsedData.personalInfo.name}` : 'Resume data');
                            
                            await api.post(`/resumes/${resumeId}/parse-local`, { 
                              parsedText,
                              pipelineStage: 'tailoring_complete'
                            });
                            
                            // Trigger analytics after successful download and pipeline update
                            console.log('Resume downloaded and pipeline stage finalized - analytics should be triggered');
                            
                          } catch (e) { 
                            console.error('Failed to update pipeline stage:', e);
                            // Continue with download even if pipeline update fails
                          }
                          
                          // Navigate based on pipeline type after successful download
                          try {
                            const currentPipeline = pipelineLib.getCurrentPipeline();
                            if (currentPipeline?.type === 'interview') {
                              // Create interview using the tailored resume
                              const jobDescription = 'General role based on tailored resume'; // Could be enhanced to use actual JD
                              const interviewResponse = await api.post('/interviews/create', {
                                resumeId,
                                jobDescription,
                                interviewType: 'technical' // Default to technical, could be made configurable
                              });
                              if (interviewResponse.data.success) {
                                const interviewId = interviewResponse.data.data.interview._id;
                                setTimeout(() => {
                                  onStartInterview(interviewId);
                                }, 1000);
                              } else {
                                // fallback to dashboard if interview creation fails
                                localStorage.setItem('navigateTo', 'dashboard');
                                setTimeout(() => {
                                  window.location.href = '/analytics';
                                }, 1000);
                              }
                            } else {
                              localStorage.setItem('navigateTo', 'dashboard');
                              setTimeout(() => {
                                window.location.href = '/analytics';
                              }, 1000);
                            }
                          } catch (e) { /* ignore */ }
                          
                        } catch (e) { 
                          console.error('Download failed:', e);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="original" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="optimized" disabled={!optimizedText}>Optimized</TabsTrigger>
                    <TabsTrigger value="latex">LaTeX Editor</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="original" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-8 min-h-[600px] shadow-sm overflow-y-auto">
                      <div className="space-y-6">
                        {resumeText ? (
                          <div>
                            <div className="text-center border-b pb-4">
                              <h2 className="text-2xl font-bold text-gray-900">Resume Preview</h2>
                            </div>
                            <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto">
                              {resumeText}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">No resume text available. Please enter your resume text above.</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="optimized" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-green-200 p-8 min-h-[600px] shadow-sm overflow-y-auto">
                      <div className="space-y-6">
                        {optimizedText ? (
                          <div>
                            <div className="text-center border-b pb-4">
                              <h2 className="text-2xl font-bold text-gray-900">Optimized Resume</h2>
                              <p className="text-sm text-green-600 mt-1">AI-optimized for better job matching</p>
                            </div>
                            <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed max-h-[500px] overflow-y-auto">
                              {optimizedText}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">No optimized resume available. Please tailor your resume first.</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="latex" className="mt-6">
                    <div className="bg-white rounded-xl border-2 border-purple-200 p-8 min-h-[600px] shadow-sm">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">LaTeX Resume Editor</h3>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={generateLatexResume}
                              disabled={isGeneratingLatex || tailoredVersions.length === 0}
                            >
                              {isGeneratingLatex ? 'Generating...' : 'Generate LaTeX'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (latexContent) {
                                  const blob = new Blob([latexContent], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = 'resume.tex';
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                }
                              }}
                              disabled={!latexContent}
                            >
                              Download .tex
                            </Button>
                          </div>
                        </div>

                        {latexContent ? (
                          <div className="space-y-4">
                            <textarea
                              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none resize-none"
                              value={latexContent}
                              onChange={(e) => setLatexContent(e.target.value)}
                              placeholder="LaTeX content will appear here..."
                              spellCheck={false}
                            />
                            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              <p className="font-medium mb-2">LaTeX Tips:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Use <code className="bg-gray-200 px-1 rounded">\\section&#123;&#125;</code> for main sections</li>
                                <li>Use <code className="bg-gray-200 px-1 rounded">\\textbf&#123;&#125;</code> for bold text</li>
                                <li>Use <code className="bg-gray-200 px-1 rounded">\\begin&#123;itemize&#125;...\\end&#123;itemize&#125;</code> for bullet points</li>
                                <li>Compile with pdflatex to generate PDF</li>
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-16">
                            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg mb-2">No LaTeX content generated yet</p>
                            <p className="text-sm">Tailor your resume first, then generate LaTeX content</p>
                          </div>
                        )}
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

          {/* Always show Proceed to Aptitude for interview pipeline, Complete & View Analytics for tailoring pipeline */}
          {currentPipeline?.type === 'interview' ? (
            <Button
              variant="hero"
              size="lg"
              className="px-8"
              onClick={async () => {
                try {
                  // Mark tailoring pipeline as complete before proceeding
                  const parsedText = parsedData?.fullText ||
                                   parsedData?.summary ||
                                   (parsedData?.personalInfo?.name ? `Resume for ${parsedData.personalInfo.name}` : 'Resume data');

                  await api.post(`/resumes/${resumeId}/parse-local`, {
                    parsedText,
                    pipelineStage: 'tailoring_complete'
                  });

                  // Navigate to aptitude test
                  if (onStartInterview) {
                    onStartInterview();
                  }
                } catch (e) {
                  console.error('Failed to update pipeline:', e);
                  alert('Failed to proceed. Please try again.');
                }
              }}
            >
              Proceed to Aptitude Test
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <Button
              variant="hero"
              size="lg"
              className="px-8"
              onClick={async () => {
                // Mark tailoring pipeline as complete and exit to dashboard
                try {
                  // Ensure we have valid parsed text
                  const parsedText = parsedData?.fullText ||
                                   parsedData?.summary ||
                                   (parsedData?.personalInfo?.name ? `Resume for ${parsedData.personalInfo.name}` : 'Resume data');

                  await api.post(`/resumes/${resumeId}/parse-local`, {
                    parsedText,
                    pipelineStage: 'tailoring_complete'
                  });

                  // Show confirmation and redirect to dashboard
                  alert('Resume tailoring completed successfully! Redirecting to dashboard...');
                  localStorage.setItem('navigateTo', 'dashboard');
                  window.location.href = '/';
                } catch (e) {
                  console.log('Pipeline update or navigation failed, continuing...', e);
                  // Still try to navigate to dashboard
                  localStorage.setItem('navigateTo', 'dashboard');
                  window.location.href = '/';
                }
              }}
            >
              Complete & View Analytics
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeTailoring;
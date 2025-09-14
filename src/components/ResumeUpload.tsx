import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle, AlertCircle, Loader, History } from "lucide-react";
import { resumeAPI } from "@/services/api";
import pipelineLib from '@/lib/pipeline';
import { useAuth } from "@/contexts/AuthContext";

type ResumeUploadProps = {
  onUploaded?: (resumeId: string) => void;
  onStartInterview?: (interviewId: string) => void;
  onSelectPreviousResume?: (resumeId: string) => void;
};

const ResumeUpload = ({ onUploaded, onStartInterview, onSelectPreviousResume }: ResumeUploadProps) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  const [jobDescription, setJobDescription] = useState("");
  
  const [resumeTextInput, setResumeTextInput] = useState('');
  const [uploadedResumeId, setUploadedResumeId] = useState<string | null>(null);
  const [uploadedResumeDetails, setUploadedResumeDetails] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previousResumes, setPreviousResumes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'previous'>('upload');
  const { user } = useAuth();
  const currentPipeline = pipelineLib.getCurrentPipeline?.();
  const pollingRef = useRef<number | null>(null);
  const [parsingPreview, setParsingPreview] = useState(false);

  const formatParsedData = (pd: any, originalText?: string) => {
    if (originalText) return originalText;
    if (!pd) return '';
    if (typeof pd === 'string') return pd;
    const parts: string[] = [];
    if (pd.personalInfo) {
      const p = pd.personalInfo;
      if (p.name) parts.push(p.name);
      if (p.email) parts.push(p.email);
      if (p.phone) parts.push(p.phone);
    }
    if (pd.summary) parts.push('\nSummary:\n' + pd.summary);
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

  const getApiOrigin = () => {
    const base = import.meta.env.VITE_API_URL || '';
    if (!base) return '';
    return base.replace(/\/api\/?$/, '');
  };
  const apiOrigin = getApiOrigin();

  const handleTextUpload = async (text: string) => {
    if (!user) return;

    setUploadStatus('uploading');
    setAnalysisProgress(0);
    setResumeTextInput(text);

    try {
      const response = await resumeAPI.uploadText({ resumeText: text });

      setAnalysisProgress(100);
      setUploadStatus('success');

      const resumeId = response?.data?.data?.resumeId;
      console.log('Resume text uploaded successfully:', response?.data);

      if (resumeId) {
        setUploadedResumeId(resumeId);
        // fetch resume details for preview
        try {
          const res = await resumeAPI.getById(resumeId);
          const resumeData = res?.data?.resume || null;
          setUploadedResumeDetails(resumeData);

          // Save to previous resumes
          if (resumeData) {
            saveToPreviousResumes({
              id: resumeId,
              name: 'Pasted Resume',
              parsedData: resumeData.parsedData,
              originalText: resumeData.originalText,
              uploadedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.warn('Failed to fetch uploaded resume details for preview', e);
        }

        // Attempt immediate parsing via backend preview endpoint so user can preview in stage 1
        try {
          const previewResp = await resumeAPI.previewText({ resumeText: text }).catch(() => null);
          if (previewResp && previewResp.data && previewResp.data.data && previewResp.data.data.parsedText) {
            const parsedText = previewResp.data.data.parsedText;
            try {
              await resumeAPI.parseLocal(resumeId, { parsedText });
              const refreshed = await resumeAPI.getById(resumeId);
              setUploadedResumeDetails(refreshed?.data?.resume || null);
              saveToPreviousResumes({
                id: resumeId,
                name: refreshed?.data?.resume?.originalFile?.originalName || 'Pasted Resume',
                parsedData: refreshed?.data?.resume?.parsedData,
                originalText: refreshed?.data?.resume?.originalText,
                uploadedAt: new Date().toISOString()
              });
            } catch (e) {
              console.warn('Failed to persist preview parsedText to backend', e);
            }
          }
        } catch (e) {
          // ignore preview failures; background parser will process text
        }
        // Start polling for parsed data if not yet available
        try {
          startPollingForParsedData(resumeId);
        } catch (e) { /* ignore */ }
        // Persist resumeId for navigation handoff (Index will read navResumeId)
        try { window.localStorage.setItem('navResumeId', resumeId); } catch(e) { /* ignore */ }

        // Create or update pipeline for navigation
        let currentPipeline = pipelineLib.getCurrentPipeline();
        if (!currentPipeline) {
          // Create a new tailoring pipeline if none exists
          currentPipeline = pipelineLib.createPipeline('tailoring', resumeId);
        } else {
          // Update existing pipeline with resumeId if not set
          if (!currentPipeline.resumeId) {
            pipelineLib.updatePipeline({ resumeId });
          }
        }

        // Mark uploaded stage as complete
        try { pipelineLib.updateStage?.('uploaded', true); } catch (e) { /* ignore */ }

        // Call onUploaded to trigger navigation to tailoring stage
        if (onUploaded) onUploaded(resumeId);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setAnalysisProgress(0);
    }
  };

  // Poll resume endpoint until parsedData is available (or max attempts reached)
  const startPollingForParsedData = (resumeId: string) => {
    let attempts = 0;
    const maxAttempts = 15;
    const intervalMs = 2000;

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    pollingRef.current = window.setInterval(async () => {
      attempts++;
      try {
        const res = await resumeAPI.getById(resumeId);
        const resumeData = res?.data?.resume || null;
        if (resumeData) {
          setUploadedResumeDetails(resumeData);
          const pd = resumeData.parsedData;
          const hasText = pd && (typeof pd === 'string' ? pd.trim().length > 0 : (pd.fullText || pd.summary));
          if (hasText) {
            if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
          }
        }
      } catch (e) {
        // ignore transient errors
      }
      if (attempts >= maxAttempts) {
        if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
      }
    }, intervalMs);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Load previous resumes from localStorage
  useEffect(() => {
    const loadPreviousResumes = () => {
      try {
        const storedResumes = localStorage.getItem('previousResumes');
        if (storedResumes) {
          const resumes = JSON.parse(storedResumes);
          setPreviousResumes(resumes);
        }
      } catch (error) {
        console.error('Failed to load previous resumes:', error);
      }
    };

    loadPreviousResumes();
  }, []);

  // Save uploaded resume to previous resumes
  const saveToPreviousResumes = (resumeData: any) => {
    try {
      const existingResumes = JSON.parse(localStorage.getItem('previousResumes') || '[]');
      const updatedResumes = [
        ...existingResumes.filter((r: any) => r.id !== resumeData.id),
        resumeData
      ].slice(-10); // Keep only last 10 resumes
      localStorage.setItem('previousResumes', JSON.stringify(updatedResumes));
      setPreviousResumes(updatedResumes);
    } catch (error) {
      console.error('Failed to save to previous resumes:', error);
    }
  };

  const handleSelectPreviousResume = (resume: any) => {
    // Populate the resume text input with the selected resume's text
    const resumeText = formatParsedData(resume.parsedData, resume.originalText);
    setResumeTextInput(resumeText);
    setActiveTab('upload'); // Switch to upload tab to show the input area

    // Set the uploaded resume details for consistency
    setUploadedResumeId(resume.id);
    setUploadedResumeDetails({
      id: resume.id,
      parsedData: resume.parsedData,
      originalText: resume.originalText,
      originalFile: { originalName: resume.name || 'Previous Resume' }
    });

    if (onSelectPreviousResume) {
      onSelectPreviousResume(resume.id);
    }
  };

  // Check if we should show additional input fields (not in tailoring pipeline stage 1)
  const showAdditionalFields = !(currentPipeline && currentPipeline.type === 'tailoring');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Resume</h1>
          <p className="text-gray-600">Upload your resume and job description to get started with AI-powered analysis</p>
        </div>

        {/* Tabs for Upload/Previous Resumes */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'previous')} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="upload">Upload New</TabsTrigger>
            <TabsTrigger value="previous">Previous Resumes</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'previous' && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-brand-primary" />
                Previous Uploaded Resumes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previousResumes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No previous resumes found</p>
                  <p className="text-sm text-gray-500 mt-2">Upload a resume to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {previousResumes.map((resume) => (
                    <div
                      key={resume.id}
                      className="p-4 border rounded-lg hover:border-brand-primary/50 transition-colors cursor-pointer"
                      onClick={() => handleSelectPreviousResume(resume)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{resume.name || 'Uploaded Resume'}</h4>
                          <p className="text-sm text-gray-600">
                            {resume.parsedData ? 
                              (typeof resume.parsedData === 'string' ? 
                                resume.parsedData.substring(0, 100) + '...' : 
                                'Resume data available') : 
                              'No parsed data'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className={`grid gap-8 ${showAdditionalFields ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Resume Upload */}
          <Card className="p-8">
            <CardHeader className="text-center pb-6">
              <CardTitle className="flex items-center gap-2 justify-center">
                <FileText className="h-6 w-6 text-brand-primary" />
                Upload Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
              </div>

              {/* Resume Text Input - always show */}
              <div className="mt-6">
                <textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-xl resize-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-colors"
                  placeholder="Paste your resume text here (or type).\n\nKeep formatting minimal — plain text works best."
                  value={resumeTextInput}
                  onChange={(e) => setResumeTextInput(e.target.value)}
                />
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">Paste your resume text above to upload and analyze.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={async () => {
                      if (!resumeTextInput.trim()) return alert('Please paste your resume text first');
                      // preview parsed text without creating resume
                      try {
                        setParsingPreview(true);
                        const previewResp = await resumeAPI.previewText({ resumeText: resumeTextInput });
                        if (previewResp && previewResp.data && previewResp.data.data) {
                          const parsed = previewResp.data.data.parsedText;
                          // show a quick local preview by setting uploadedResumeDetails locally
                          setUploadedResumeDetails({ parsedData: parsed ? parsed : null });
                          setShowPreview(true);
                        }
                      } catch (e) {
                        console.warn('Preview text failed', e);
                        alert('Preview failed. Try again.');
                      } finally { setParsingPreview(false); }
                    }} disabled={parsingPreview}>{parsingPreview ? 'Previewing...' : 'Preview'}</Button>
                    <Button variant="professional" onClick={async () => {
                      if (!resumeTextInput.trim()) return alert('Please paste your resume text first');
                      await handleTextUpload(resumeTextInput);
                    }}>Upload Text</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Text input + Job Description - show only when not in tailoring pipeline stage 1 */}
          {showAdditionalFields && (
            <Card className="p-8">
              <CardHeader className="text-center pb-6">
                <CardTitle className="flex items-center gap-2 justify-center">
                  <FileText className="h-6 w-6 text-brand-primary" />
                  Job Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full h-64 p-4 border border-gray-300 rounded-xl resize-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none transition-colors"
                  placeholder="Paste the job description here...

Include:
• Job title and company
• Required skills and qualifications
• Responsibilities and duties
• Experience requirements"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <div className="mt-4 flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    Include all relevant details for better analysis
                  </p>
                    <Button
                    variant="professional"
                    disabled={!uploadedResumeId || !jobDescription.trim()}
                    onClick={async () => {
                      if (!uploadedResumeId || !jobDescription.trim()) return;
                      try {
                        // Change pipeline type to 'interview' BEFORE tailoring
                        let currentPipeline = pipelineLib.getCurrentPipeline();
                        if (!currentPipeline) {
                          // Create interview pipeline if none exists
                          currentPipeline = pipelineLib.createPipeline('interview', uploadedResumeId);
                        } else if (currentPipeline.type === 'tailoring') {
                          // Update existing tailoring pipeline to interview
                          pipelineLib.updatePipeline({ type: 'interview' });
                        }

                        // Call tailoring endpoint to create a tailored version for this resume
                        const resp = await resumeAPI.tailor(uploadedResumeId, { jobDescription, templateType: 'professional' });
                        const latexContent = resp?.data?.data?.latex || resp?.data?.latex || null;
                        if (latexContent) {
                          // Create a tailored version object
                          const tailoredVersion = {
                            jobDescription,
                            tailoredContent: latexContent, // Use latex as tailored content for now
                            latexContent,
                            template: {
                              name: 'professional',
                              category: 'professional',
                              isPremium: false
                            }
                          };
                          // Attach to uploadedResumeDetails
                          setUploadedResumeDetails((prev: any) => {
                            const updated = { ...(prev || {}) };
                            updated.tailoredVersions = updated.tailoredVersions || [];
                            updated.tailoredVersions.push(tailoredVersion);
                            return updated;
                          });
                          try { pipelineLib.updateStage?.('tailored', true); } catch (e) { /* ignore */ }

                          // Navigate to tailoring stage with interview pipeline
                          localStorage.setItem('navigateTo', 'tailoring');
                          localStorage.setItem('navResumeId', uploadedResumeId);
                          window.location.href = '/';
                        } else {
                          alert('Tailoring completed but no tailored content was returned.');
                        }
                      } catch (error: any) {
                        console.error('Tailor failed', error);
                        alert('Tailoring failed: ' + (error?.message || 'Unknown error'));
                      }
                    }}
                  >
                    Tailor Resume
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>


      </div>
    </div>
  );
};

export default ResumeUpload;
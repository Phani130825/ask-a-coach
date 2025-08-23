import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";

const ResumeUpload = () => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploadStatus('uploading');
    setAnalysisProgress(0);
    
    // Simulate upload and analysis progress
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadStatus('success');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === 'application/pdf' || file.type.includes('document'))) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Resume</h1>
          <p className="text-gray-600">Upload your resume and job description to get started with AI-powered analysis</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Resume Upload */}
          <Card className="p-8">
            <CardHeader className="text-center pb-6">
              <CardTitle className="flex items-center gap-2 justify-center">
                <FileText className="h-6 w-6 text-brand-primary" />
                Upload Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-brand-primary bg-brand-primary/5' 
                    : uploadStatus === 'success' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-brand-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {uploadStatus === 'idle' && (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Drag & drop your resume here, or click to browse</p>
                    <p className="text-sm text-gray-500 mb-4">Supports PDF, DOC, DOCX files</p>
                    <Button variant="professional">Choose File</Button>
                  </>
                )}
                
                {uploadStatus === 'uploading' && (
                  <>
                    <Loader className="h-12 w-12 text-brand-primary mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600 mb-4">Analyzing your resume...</p>
                    <Progress value={analysisProgress} className="w-full max-w-xs mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">{analysisProgress}% complete</p>
                  </>
                )}
                
                {uploadStatus === 'success' && (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Resume uploaded successfully!</p>
                    <p className="text-sm text-gray-500">Analysis complete - ready for next step</p>
                  </>
                )}
                
                {uploadStatus === 'error' && (
                  <>
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Upload failed. Please try again.</p>
                    <Button variant="professional" onClick={() => setUploadStatus('idle')}>
                      Try Again
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Description */}
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
              />
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Include all relevant details for better analysis
                </p>
                <Button variant="professional">
                  Analyze Match
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Results Preview */}
        {uploadStatus === 'success' && (
          <Card className="mt-8 p-6 slide-in-up">
            <CardHeader>
              <CardTitle>Quick Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600 mb-2">87%</div>
                  <div className="text-sm text-gray-600">Skills Match</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600 mb-2">12</div>
                  <div className="text-sm text-gray-600">Keywords Found</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600 mb-2">3</div>
                  <div className="text-sm text-gray-600">Improvements</div>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Button variant="hero" size="lg">
                  Proceed to Resume Tailoring
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ResumeUpload;
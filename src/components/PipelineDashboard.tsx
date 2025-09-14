import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Trash2,
  Eye,
  ArrowRight
} from "lucide-react";
import { pipelineAPI } from '@/services/api';

type Pipeline = {
  id: string;
  type: string;
  resume: any;
  stages: any;
  metadata: any;
  isComplete: boolean;
};

const PipelineDashboard = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const response = await pipelineAPI.getAll();
      setPipelines(response.data.data.pipelines || []);
    } catch (error) {
      console.error('Failed to load pipelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePipeline = async (pipelineId: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;
    
    try {
      await pipelineAPI.delete(pipelineId);
      await loadPipelines(); // Reload the list
    } catch (error) {
      console.error('Failed to delete pipeline:', error);
      alert('Failed to delete pipeline. It may not be completed yet.');
    }
  };

  const getStageProgress = (stages: any) => {
    const totalStages = 6; // uploaded, tailored, aptitude, coding, interview, analytics
    const completedStages = Object.keys(stages || {}).filter(key =>
      stages[key] === true && key !== 'completedAt'
    ).length;
    return (completedStages / totalStages) * 100;
  };

  const getStageStatus = (stage: string, stages: any) => {
    if (stages?.[stage]) {
      return { status: 'completed', icon: <CheckCircle className="h-4 w-4 text-green-500" /> };
    }
    return { status: 'pending', icon: <Clock className="h-4 w-4 text-gray-400" /> };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pipelines...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pipeline Dashboard
          </h1>
          <p className="text-gray-600">
            Track your resume processing and interview preparation progress
          </p>
        </div>

        {pipelines.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pipelines Found</h3>
              <p className="text-gray-600 mb-4">
                Start by uploading a resume to create your first pipeline.
              </p>
              <Button 
                variant="hero"
                onClick={() => {
                  try { localStorage.setItem('navigateTo', 'upload'); } catch (e) { /* ignore */ }
                }}
              >
                Upload Resume
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-brand-primary" />
                      <div>
                        <CardTitle className="text-lg">
                          {pipeline.type === 'tailoring' ? 'Resume Tailoring' : 'Interview Pipeline'}
                        </CardTitle>
                        <p className="text-sm text-gray-500">
                          Created {new Date(pipeline.metadata?.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pipeline.isComplete ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(getStageProgress(pipeline.stages))}%</span>
                      </div>
                      <Progress value={getStageProgress(pipeline.stages)} className="h-2" />
                    </div>

                    {/* Stage Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        {getStageStatus('uploaded', pipeline.stages).icon}
                        <span className="text-sm">Resume Uploaded</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStageStatus('tailored', pipeline.stages).icon}
                        <span className="text-sm">Resume Tailored</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStageStatus('aptitude', pipeline.stages).icon}
                        <span className="text-sm">Aptitude Test</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStageStatus('coding', pipeline.stages).icon}
                        <span className="text-sm">Coding Round</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStageStatus('interview', pipeline.stages).icon}
                        <span className="text-sm">Interview Simulation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStageStatus('analytics', pipeline.stages).icon}
                        <span className="text-sm">Analysis</span>
                      </div>
                    </div>

                    {/* Resume Info */}
                    {pipeline.resume && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-1">Resume Details</h4>
                        <p className="text-sm text-gray-600">
                          Status: {pipeline.resume.status}
                        </p>
                        {pipeline.resume.originalFile && (
                          <p className="text-sm text-gray-600">
                            File: {pipeline.resume.originalFile.originalName}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          try {
                            localStorage.setItem('navResumeId', pipeline.resume?._id || pipeline.resume?.id);
                            localStorage.setItem('navigateTo', 'tailoring');
                          } catch (e) { /* ignore */ }
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>

                      {pipeline.stages?.tailored && !pipeline.stages?.aptitude && (
                        <Button
                          variant="hero"
                          size="sm"
                          onClick={() => {
                            try {
                              localStorage.setItem('navResumeId', pipeline.resume?._id || pipeline.resume?.id);
                              localStorage.setItem('navigateTo', 'aptitude');
                            } catch (e) { /* ignore */ }
                          }}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Start Aptitude Test
                        </Button>
                      )}

                      {pipeline.stages?.aptitude && !pipeline.stages?.coding && (
                        <Button
                          variant="hero"
                          size="sm"
                          onClick={() => {
                            try {
                              localStorage.setItem('navResumeId', pipeline.resume?._id || pipeline.resume?.id);
                              localStorage.setItem('navigateTo', 'coding');
                            } catch (e) { /* ignore */ }
                          }}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Start Coding Round
                        </Button>
                      )}

                      {pipeline.stages?.coding && !pipeline.stages?.interview && (
                        <Button
                          variant="hero"
                          size="sm"
                          onClick={() => {
                            try {
                              localStorage.setItem('navResumeId', pipeline.resume?._id || pipeline.resume?.id);
                              localStorage.setItem('navigateTo', 'interview');
                            } catch (e) { /* ignore */ }
                          }}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Start Interview
                        </Button>
                      )}

                      {pipeline.stages?.interview && !pipeline.stages?.analytics && (
                        <Button
                          variant="hero"
                          size="sm"
                          onClick={() => {
                            try {
                              localStorage.setItem('navResumeId', pipeline.resume?._id || pipeline.resume?.id);
                              localStorage.setItem('navigateTo', 'analytics');
                            } catch (e) { /* ignore */ }
                          }}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          View Analysis
                        </Button>
                      )}

                      {pipeline.stages?.analytics && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePipeline(pipeline.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PipelineDashboard;

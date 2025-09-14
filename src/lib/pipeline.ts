export type PipelineType = 'tailoring' | 'interview';

export interface Pipeline {
  id: string;
  type: PipelineType;
  resumeId?: string | null;
  stages: Record<string, boolean>;
  createdAt: string;
}

const STORAGE_KEY = 'currentPipeline';

const defaultStages = (type: PipelineType) => {
  if (type === 'tailoring') return { uploaded: false, tailored: false };
  return { uploaded: false, tailored: false, interview: false, analytics: false };
};

export function createPipeline(type: PipelineType, resumeId?: string) {
  const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
  const pipeline: Pipeline = {
    id,
    type,
    resumeId: resumeId ?? null,
    stages: defaultStages(type),
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pipeline));

  // Attempt to persist to backend (best-effort)
  try {
    const token = localStorage.getItem('token');
    if (token) {
      fetch((import.meta.env.VITE_API_URL || '') + '/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type, resumeId })
      }).catch(() => { /* ignore */ });
    }
  } catch (e) { /* ignore */ }

  return pipeline;
}

export function getCurrentPipeline(): Pipeline | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pipeline;
  } catch (err) {
    console.error('Failed to read pipeline', err);
    return null;
  }
}

export function updatePipeline(updates: Partial<Pipeline>) {
  const current = getCurrentPipeline();
  if (!current) return null;
  const merged = { ...current, ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function updateStage(stage: string, value = true) {
  const current = getCurrentPipeline();
  if (!current) return null;
  const stages = { ...current.stages, [stage]: value };
  const updated = { ...current, stages };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  // Attempt to persist stage update to backend (best-effort)
  try {
    const token = localStorage.getItem('token');
    if (token && current) {
      const resumeId = current.resumeId;
      fetch((import.meta.env.VITE_API_URL || '') + `/resumes/${resumeId}/parse-local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ pipelineStage: stage })
      }).catch(() => { /* ignore */ });
    }
  } catch (e) { /* ignore */ }

  return updated;
}

export function clearPipeline() {
  localStorage.removeItem(STORAGE_KEY);
}

export default {
  createPipeline,
  getCurrentPipeline,
  updatePipeline,
  updateStage,
  clearPipeline
};

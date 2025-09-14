import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Attempt to refresh token
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token } = response.data.data;

          // Update token in localStorage
          localStorage.setItem('token', token);

          // Update Authorization header and retry original request
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh token invalid or expired, remove tokens and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available - this could be an old account
        // For old accounts, we should redirect to login to get new tokens
        console.warn('No refresh token available. This appears to be an old account that needs re-authentication.');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  updatePreferences: (preferences) => api.put('/users/preferences', preferences),
  changePassword: (passwordData) => api.put('/users/password', passwordData),
  getStats: () => api.get('/users/stats'),
};

// Resume API
export const resumeAPI = {
  upload: (formData) => api.post('/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Upload resume text directly (JSON body: { resumeText: string })
  uploadText: (data) => api.post('/resumes/upload-text', data),
  getAll: () => api.get('/resumes'),
  getById: (id) => api.get(`/resumes/${id}`),
  // Preview can accept either multipart/form-data (file) or JSON { resumeText }
  preview: (formData) => api.post('/resumes/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  previewText: (data) => api.post('/resumes/preview', data),
  // Accept parsed text from a trusted client and save to resume record
  parseLocal: (id, data) => api.post(`/resumes/${id}/parse-local`, data),
  analyze: (id, jobDescription) => api.post(`/resumes/${id}/analyze`, { jobDescription }),
  tailor: (id, data) => api.post(`/resumes/${id}/tailor`, data),
  getTemplates: (id) => api.get(`/resumes/${id}/templates`),
  generateTemplate: (id, data) => api.post(`/resumes/${id}/generate-template`, data),
  delete: (id) => api.delete(`/resumes/${id}`),
};

// Interview API
export const interviewAPI = {
  create: (interviewData) => api.post('/interviews/create', interviewData),
  getAll: (params) => api.get('/interviews', { params }),
  getById: (id) => api.get(`/interviews/${id}`),
  start: (id) => api.post(`/interviews/${id}/start`),
  submitResponse: (id, responseData) => api.post(`/interviews/${id}/response`, responseData),
  end: (id) => api.post(`/interviews/${id}/end`),
  uploadRecording: (id, recordingData) => api.post(`/interviews/${id}/recording`, recordingData),
  getQuestions: (id) => api.get(`/interviews/${id}/questions`),
  getProgress: (id) => api.get(`/interviews/${id}/progress`),
  delete: (id) => api.delete(`/interviews/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getPerformance: (params) => api.get('/analytics/performance', { params }),
  getResumeInsights: () => api.get('/analytics/resume-insights'),
  compare: (params) => api.get('/analytics/compare', { params }),
  generateFeedback: (data) => api.post('/analytics/feedback', data),
  export: (params) => api.get('/analytics/export', { params }),
};

// AI API
export const aiAPI = {
  chat: (message, context, interviewType) => api.post('/ai/chat', { message, context, interviewType }),
  getFeedback: (question, response, context) => api.post('/ai/feedback', { question, response, context }),
  getResumeTips: (data) => api.post('/ai/resume-tips', data),
  getInterviewPrep: (data) => api.post('/ai/interview-prep', data),
  analyzeSkills: (data) => api.post('/ai/skill-analysis', data),
  getCompanyResearch: (data) => api.post('/ai/company-research', data),
  getStatus: () => api.get('/ai/status'),
};

// File upload helper
export const uploadFile = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('resume', file);

  return api.post('/resumes/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

// Error handler
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { data, status } = error.response;
    return {
      message: data.error || data.message || 'An error occurred',
      status,
      details: data,
    };
  } else if (error.request) {
    // Request made but no response
    return {
      message: 'No response from server. Please check your connection.',
      status: 0,
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    };
  }
};

export default api;

// Pipeline API
export const pipelineAPI = {
  create: (pipelineData) => api.post('/pipelines', pipelineData),
  getAll: () => api.get('/pipelines'),
  getById: (id) => api.get(`/pipelines/${id}`),
  update: (id, updates) => api.put(`/pipelines/${id}`, updates),
  delete: (id) => api.delete(`/pipelines/${id}`),
  updateStage: (id, stageData) => api.patch(`/pipelines/${id}/stage`, stageData),
  getAptitudeQuestions: () => api.get('/pipelines/aptitude-questions'),
};

// Coding API
export const codingAPI = {
  runTests: (data) => api.post('/coding/run-tests', data),
};

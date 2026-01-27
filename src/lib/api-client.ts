import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signUp: async (email: string, password: string, fullName?: string) => {
    const response = await api.post('/auth/signup', { 
      email, 
      password, 
      fullName 
    });
    return response.data;
  },

  signIn: async (email: string, password: string) => {
    const response = await api.post('/auth/signin', { email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/user');
    return response.data;
  },

  signOut: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },
};

// Applications API
export const applicationsAPI = {
  getAll: async () => {
    const response = await api.get('/applications');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/applications/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/applications', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/applications/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/applications/${id}`);
  },
};

// Dashboard API
export const dashboardAPI = {
  getSummary: async () => {
    const response = await api.get('/dashboard/summary');
    return response.data;
  },
};

// Match API
export const matchAPI = {
  analyze: async (resumeText: string, jobText: string) => {
    const response = await api.post('/match', {
      resume_text: resumeText,
      job_text: jobText,
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/match/history');
    return response.data;
  },
};

export default api;
import axios from 'axios';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  status: string;
  location?: string | null;
  job_url?: string | null;
  date_applied?: string | null;
  next_interview_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ApplicationInput = Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface DashboardSummary {
  total: number;
  by_status: Record<string, number>;
  upcoming_interviews: Application[];
}

export interface MatchResult {
  id: string;
  score: number;
  overlap_keywords: string[];
  missing_keywords: string[];
  tips: string[];
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  signUp: async (email: string, password: string, fullName?: string) => {
    const response = await api.post<AuthResponse>('/auth/signup', {
      email, 
      password, 
      fullName 
    });
    return response.data;
  },

  signIn: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/signin', { email, password });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get<{ user: AuthUser }>('/auth/user');
    return response.data;
  },

  signOut: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  },
};

export const applicationsAPI = {
  getAll: async () => {
    const response = await api.get<Application[]>('/applications');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<Application>(`/applications/${id}`);
    return response.data;
  },

  create: async (data: ApplicationInput) => {
    const response = await api.post<Application>('/applications', data);
    return response.data;
  },

  update: async (id: string, data: ApplicationInput) => {
    const response = await api.put<Application>(`/applications/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/applications/${id}`);
  },
};

export const dashboardAPI = {
  getSummary: async () => {
    const response = await api.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },
};

export const matchAPI = {
  analyze: async (resumeText: string, jobText: string) => {
    const response = await api.post<MatchResult>('/match', {
      resume_text: resumeText,
      job_text: jobText,
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get<MatchResult[]>('/match/history');
    return response.data;
  },
};

export default api;

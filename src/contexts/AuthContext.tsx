import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { authAPI, type AuthUser } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  session: { token: string } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type User = AuthUser;

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || fallback;
  }
  return fallback;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);
        setSession({ token });
        
        authAPI.getCurrentUser().catch(() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          setUser(null);
          setSession(null);
        });
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
    
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await authAPI.signUp(email, password, fullName);
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      setUser(response.user);
      setSession({ token: response.token });
      return { error: null };
    } catch (error: unknown) {
      return { error: new Error(getAuthErrorMessage(error, 'Failed to sign up')) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authAPI.signIn(email, password);
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));
      setUser(response.user);
      setSession({ token: response.token });
      return { error: null };
    } catch (error: unknown) {
      return { error: new Error(getAuthErrorMessage(error, 'Failed to sign in')) };
    }
  };

  const signOut = async () => {
    authAPI.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

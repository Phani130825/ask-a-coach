import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/services/api';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscription: string;
  isActive: boolean;
  emailVerified: boolean;
  stats: {
    totalInterviews: number;
    averageScore: number;
    totalPracticeTime: number;
    lastActive: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async (retryCount = 0) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');

      if (token) {
        const response = await authAPI.getProfile();
        setUser(response.data.data.user);

        // If we have a token but no refresh token, this is an old account
        // We should get a refresh token for future use
        if (!refreshToken) {
          console.warn('User authenticated but no refresh token found. This is an old account.');
          // For now, just log the warning. The user will get a refresh token on next login
        }
      }
    } catch (error) {
      // Only remove token if error response status is 401 Unauthorized
      if (error.response && error.response.status === 401) {
        console.error('Auth check failed with 401 Unauthorized:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);
      } else {
        // For other errors (e.g. network), retry with exponential backoff
        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.warn(`Auth check failed with non-401 error (attempt ${retryCount + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error);
          setTimeout(() => checkAuth(retryCount + 1), delay);
          return; // Don't set loading to false yet
        } else {
          console.error('Auth check failed after all retries:', error);
          // Keep token and user state unchanged for non-401 errors
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, refreshToken, user } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      const response = await authAPI.register({ firstName, lastName, email, password });
      const { token, refreshToken, user } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

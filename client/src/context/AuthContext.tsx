import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { apiClient } from '../api/apiClient';
import { getSocket, disconnectSocket } from '../api/socketClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;
  sendOtp: (phone: string, email: string, name?: string) => Promise<{
    success: boolean;
    code?: string;
    emailPreviewUrl?: string;
    message: string;
  }>;
  verifyOtp: (identifier: string, code: string) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('voxa_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [pendingCredentials, setPendingCredentials] = useState<{
    phone: string;
    email: string;
    name?: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('voxa_user', JSON.stringify(user));
      const token = localStorage.getItem('voxa_token');
      if (token) {
        getSocket(token, user.id);
      }
    } else {
      localStorage.removeItem('voxa_user');
      localStorage.removeItem('voxa_token');
      disconnectSocket();
    }
  }, [user]);

  const sendOtp = async (phone: string, email: string, name?: string) => {
    setIsLoading(true);
    setPendingCredentials({ phone, email, name });

    try {
      const response = await apiClient.post('/auth/send-otp', {
        phone: phone.trim(),
        email: email.trim(),
        name: name?.trim(),
      });

      setIsLoading(false);
      return {
        success: true,
        code: response.data.code,
        emailPreviewUrl: response.data.emailPreviewUrl || undefined,
        message: response.data.message || `OTP sent to ${phone} and ${email}`,
      };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        message: err.response?.data?.error || 'Failed to send OTP. Make sure the server is running.',
      };
    }
  };

  const verifyOtp = async (_identifier: string, code: string) => {
    setIsLoading(true);
    const phone = pendingCredentials?.phone || '';
    const email = pendingCredentials?.email || '';
    const name = pendingCredentials?.name || '';

    try {
      const response = await apiClient.post('/auth/verify-otp', { phone, email, name, code });
      const { token, user: authedUser } = response.data;
      localStorage.setItem('voxa_token', token);
      setUser(authedUser);
      setShowWelcome(true);
      setIsLoading(false);
      setPendingCredentials(null);
      return { success: true, message: 'Verification successful!' };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        message: err.response?.data?.error || 'Invalid or expired OTP code. Please check and retry.',
      };
    }
  };

  // ─── Google OAuth Login ───────────────────────────────────────────────────
  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/google', { credential });
      const { token, user: authedUser } = response.data;
      localStorage.setItem('voxa_token', token);
      setUser(authedUser);
      setShowWelcome(true);
      setIsLoading(false);
      return { success: true, message: 'Google sign-in successful!' };
    } catch (err: any) {
      setIsLoading(false);
      const msg = err.response?.data?.error || err.message || 'Google sign-in failed. Please try again.';
      console.error('[AuthContext] Google auth error:', msg, err);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    setShowWelcome(false);
    localStorage.removeItem('voxa_user');
    localStorage.removeItem('voxa_token');
    disconnectSocket();
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    try {
      const response = await apiClient.patch('/users/profile', data);
      if (response.data?.user) {
        setUser(response.data.user);
      } else {
        setUser({ ...user, ...data });
      }
    } catch {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        showWelcome,
        setShowWelcome,
        sendOtp,
        verifyOtp,
        loginWithGoogle,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken, removeToken } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  savingsGoal: number;
  role?: 'user' | 'admin';
  status?: 'active' | 'suspended' | 'pending';
  lastLogin?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
}

export interface LoginResult {
  requires2FA?: boolean;
  email?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<LoginResult>;
  verify2FA: (email: string, code: string) => Promise<void>;
  resend2FA: (email: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const userData = await api.me();
      setUser(userData);
    } catch (err) {
      console.error('Failed to load profile:', err);
      logout();
    }
  };

  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      setTokenState(null);
    };

    window.addEventListener('cashbank-auth-logout', handleLogoutEvent);

    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      window.removeEventListener('cashbank-auth-logout', handleLogoutEvent);
    };
  }, [token]);

  const login = async (email: string, password: string, twoFactorCode?: string): Promise<LoginResult> => {
    const res = await api.login({ email, password, twoFactorCode });
    if (res.requires2FA) {
      return { requires2FA: true, email: res.email, message: res.message };
    }

    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return { requires2FA: false };
  };

  const verify2FA = async (email: string, code: string) => {
    const res = await api.verify2FA({ email, code });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const resend2FA = async (email: string) => {
    await api.send2FACode({ email });
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
  };

  const logout = () => {
    removeToken();
    setTokenState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        verify2FA,
        resend2FA,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


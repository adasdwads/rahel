import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authAPI } from '../services/api';
import type { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  sendHeartbeat: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: true,
  });

  const setAuth = useCallback((user: User, token: string) => {
    localStorage.setItem('rahel_token', token);
    localStorage.setItem('rahel_user', JSON.stringify(user));
    setState({ user, token, isAuthenticated: true, loading: false });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('rahel_token');
    localStorage.removeItem('rahel_user');
    setState({ user: null, token: null, isAuthenticated: false, loading: false });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('rahel_token');
    const userStr = localStorage.getItem('rahel_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        setState({ user, token, isAuthenticated: true, loading: false });

        authAPI.getProfile().then(res => {
          setState(prev => ({ ...prev, user: res.data, loading: false }));
          localStorage.setItem('rahel_user', JSON.stringify(res.data));
        }).catch(() => {
          clearAuth();
        });
      } catch {
        clearAuth();
      }
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [clearAuth]);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    setAuth(res.data.user, res.data.token);
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const res = await authAPI.register({ name, email, password, phone });
    setAuth(res.data.user, res.data.token);
  };

  const logout = () => {
    clearAuth();
  };

  const refreshProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      setState(prev => ({ ...prev, user: res.data }));
      localStorage.setItem('rahel_user', JSON.stringify(res.data));
    } catch {
      // ignore
    }
  };

  const sendHeartbeat = async () => {
    try {
      await authAPI.heartbeat();
      await refreshProfile();
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshProfile, sendHeartbeat }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

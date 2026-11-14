import React, { createContext, useContext, useState, useEffect } from 'react';
import { IAdmin } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  admin: IAdmin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, admin: IAdmin) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<IAdmin | null>(() => {
    try {
      const saved = localStorage.getItem('quickmart_admin_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('quickmart_admin_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (newToken: string, adminProfile: IAdmin) => {
    localStorage.setItem('quickmart_admin_token', newToken);
    localStorage.setItem('quickmart_admin_profile', JSON.stringify(adminProfile));
    setToken(newToken);
    setAdmin(adminProfile);
  };

  const logout = () => {
    try {
      if (token) {
        api.post('/admin/auth/logout').catch(() => {});
      }
    } finally {
      localStorage.removeItem('quickmart_admin_token');
      localStorage.removeItem('quickmart_admin_profile');
      setToken(null);
      setAdmin(null);
    }
  };

  const refreshProfile = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get<{ success: boolean; admin: IAdmin }>('/admin/auth/me');
      if (res.success && res.admin) {
        setAdmin(res.admin);
        localStorage.setItem('quickmart_admin_profile', JSON.stringify(res.admin));
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    const handleExpired = () => {
      setToken(null);
      setAdmin(null);
    };

    window.addEventListener('admin_auth_expired', handleExpired);
    return () => window.removeEventListener('admin_auth_expired', handleExpired);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

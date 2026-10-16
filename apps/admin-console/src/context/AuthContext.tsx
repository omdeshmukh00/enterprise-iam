'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  loginWithOtp: (payload: { email: string; code: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that do not require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.auth.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!user && !isPublic) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (user && pathname.startsWith('/admin') && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.auth.login(credentials);
    setUser(res.user);
    if (res.user.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const loginWithOtp = async (payload: { email: string; code: string }) => {
    const res = await api.auth.verifyOtp(payload);
    setUser(res.user);
    if (res.user.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: user?.role === 'ADMIN',
        login,
        loginWithOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { identityhub, IdentityHubUser } from '../lib/identityhub';

interface AnalyticsAuthContextType {
  user: IdentityHubUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AnalyticsAuthContext = createContext<AnalyticsAuthContextType | undefined>(undefined);

export function AnalyticsAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IdentityHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const currentUser = await identityhub.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (isLoading) return;

    if (!user && pathname !== '/login') {
      window.location.replace('/login');
    } else if (user && pathname === '/login') {
      window.location.replace('/');
    }
  }, [user, isLoading, pathname]);

  const logout = async () => {
    await identityhub.logout();
    setUser(null);
    window.location.replace('/login');
  };

  return (
    <AnalyticsAuthContext.Provider value={{ user, isLoading, logout, refresh }}>
      {children}
    </AnalyticsAuthContext.Provider>
  );
}

export function useAnalyticsAuth() {
  const context = useContext(AnalyticsAuthContext);
  if (!context) {
    throw new Error('useAnalyticsAuth must be used within AnalyticsAuthProvider');
  }
  return context;
}

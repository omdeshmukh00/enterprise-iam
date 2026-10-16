'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

import { usePathname } from 'next/navigation';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

  // Public routes (login, register, verify-email, reset-password) render immediately
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading IdentityHub session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const res = await api.auth.resendVerification(user.email);
      setResendStatus(res.message);
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Verification Alert Banner if unverified */}
        {!user.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Your email address <strong>{user.email}</strong> is unverified. Please check your inbox or request a new link.
              </span>
            </div>
            <div className="flex items-center space-x-3">
              {resendStatus && (
                <span className="text-xs text-amber-700">{resendStatus}</span>
              )}
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline disabled:opacity-50"
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

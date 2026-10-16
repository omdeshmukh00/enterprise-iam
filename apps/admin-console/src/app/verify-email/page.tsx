'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { Shield, CheckCircle2, AlertCircle, Loader2, ArrowRight, KeyRound } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [message, setMessage] = useState('');

  // 6-Digit OTP manual verification
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      setIsLoading(true);
      try {
        const res = await api.auth.verifyEmail(token);
        setIsSuccess(true);
        setMessage(res.message || 'Email verified successfully.');
      } catch (err: any) {
        setIsSuccess(false);
        setMessage(err.message || 'Verification failed. The link may have expired or already been used.');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [token]);

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode || manualCode.length !== 6) {
      setManualError('Please enter a valid 6-digit verification code.');
      return;
    }

    setIsVerifyingManual(true);
    setManualError(null);

    try {
      const res = await api.auth.verifyEmail(manualCode.trim());
      setIsSuccess(true);
      setMessage(res.message || 'Email verified successfully.');
    } catch (err: any) {
      setManualError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setIsResending(true);
    setResendStatus(null);
    try {
      const res = await api.auth.resendVerification(resendEmail);
      setResendStatus(res.message);
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Email Verification
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Verify your enterprise email address to activate your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10 text-center space-y-6">
          {isLoading && (
            <div className="py-6 flex flex-col items-center space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-600">Verifying your email token...</p>
            </div>
          )}

          {!isLoading && isSuccess && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Email Verified Successfully</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          )}

          {!isLoading && !isSuccess && (
            <div className="space-y-6">
              {message && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3 text-amber-800 text-xs text-left">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              {/* 6-Digit OTP Manual Input Form */}
              <div className="text-left bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-1.5 text-slate-900 font-semibold text-xs mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Enter 6-Digit Verification Code</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Check your inbox for the code included in your verification email.
                </p>

                {manualError && (
                  <p className="text-xs text-red-600 mb-2 font-medium">{manualError}</p>
                )}

                <form onSubmit={handleManualVerify} className="space-y-3">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-center tracking-[0.4em] font-mono text-lg font-bold border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingManual || manualCode.length !== 6}
                    className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                  >
                    {isVerifyingManual && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Verify Code</span>
                  </button>
                </form>
              </div>

              {/* Resend Verification Section */}
              <div className="pt-4 border-t border-slate-100 text-left">
                <h4 className="text-xs font-bold text-slate-900 mb-1">Need a new verification email?</h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Enter your email address to receive a fresh verification link and code.
                </p>
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isResending}
                    className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md disabled:opacity-50 transition-colors"
                  >
                    {isResending ? 'Sending...' : 'Request New Email'}
                  </button>
                  {resendStatus && (
                    <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                      {resendStatus}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

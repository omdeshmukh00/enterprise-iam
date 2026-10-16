'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
} from 'lucide-react';

type LoginMode = 'password' | 'otp';

export default function LoginPage() {
  const { login, loginWithOtp } = useAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>('password');

  // Common & Password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP fields
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState<string | null>(null);

  // Status & Errors
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Login Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({ email, password });
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter your email address first.');
      return;
    }

    setIsSendingOtp(true);
    setErrorMessage(null);
    setOtpSuccessMessage(null);

    try {
      const res = await api.auth.sendOtp(email);
      setOtpSent(true);
      setOtpSuccessMessage(res.message || 'A 6-digit one-time code has been sent to your email.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch login code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP & Sign In
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setErrorMessage('Please enter the 6-digit one-time code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await loginWithOtp({ email, code: otpCode.trim() });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Sign in to IdentityHub
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enterprise Identity and Access Management Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {/* Login Method Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMode('password');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                loginMode === 'password'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('otp');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                loginMode === 'otp'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email OTP</span>
            </button>
          </div>

          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {otpSuccessMessage && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-3 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{otpSuccessMessage}</span>
            </div>
          )}

          {/* Mode 1: Password Form */}
          {loginMode === 'password' && (
            <form className="space-y-5" onSubmit={handlePasswordSubmit}>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                  Email address
                </label>
                <div className="mt-1.5">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <div className="text-xs">
                    <Link
                      href="/forgot-password"
                      className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Email OTP Form */}
          {loginMode === 'otp' && (
            <div className="space-y-5">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label htmlFor="otp-email" className="block text-xs font-semibold text-slate-700">
                      Email address
                    </label>
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      We will email you a secure 6-digit one-time code to authenticate.
                    </p>
                    <input
                      id="otp-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
                  >
                    {isSendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        <span>Send Login Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="otpCode" className="block text-xs font-semibold text-slate-700">
                        6-Digit Login Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtpCode('');
                          setOtpSuccessMessage(null);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                      >
                        Change email
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
                      Code sent to <span className="font-semibold text-slate-700">{email}</span>
                    </p>
                    <input
                      id="otpCode"
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="appearance-none block w-full px-3 py-2.5 text-center tracking-[0.5em] font-mono text-xl font-bold border border-slate-300 rounded-md shadow-sm placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Verifying & Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={isSendingOtp}
                      onClick={() => handleSendOtp()}
                      className="inline-flex items-center text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                      <span>Didn&apos;t get the code? Resend</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

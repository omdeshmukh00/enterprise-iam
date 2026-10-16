'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Shield, KeyRound, Loader2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.auth.forgotPassword(email);
      setMessage(res.message);
      setIsSubmitted(true);
    } catch {
      // Always show safe non-enumerating message
      setMessage('If an account is associated with this email address, a password recovery link has been sent.');
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Reset your password
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enter your work email address and we will send you a recovery link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {isSubmitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Recovery email dispatched</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
              <div className="pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                  Email address
                </label>
                <div className="mt-1.5">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

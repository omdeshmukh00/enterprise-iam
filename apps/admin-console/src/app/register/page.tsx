'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Shield, AlertCircle, CheckCircle2, Loader2, ArrowRight, Mail, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const passwordChecks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'At least one number', valid: /[0-9]/.test(password) },
    { label: 'At least one special character', valid: /[^A-Za-z0-9]/.test(password) },
  ];

  const isPasswordValid = passwordChecks.every((c) => c.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Please ensure your password meets all enterprise complexity requirements.');
      return;
    }

    setIsLoading(true);

    try {
      await api.auth.register({
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
      });
      setRegisteredEmail(email);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-10 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Check your inbox</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              We have dispatched a verification email to <strong>{registeredEmail}</strong>. Please click the link inside the email to activate your account.
            </p>
            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/login"
                className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Proceed to Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Create an IdentityHub account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Centralized Single Sign-On and Access Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold text-slate-700">
                  First name
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold text-slate-700">
                  Last name
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                Work Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@company.com"
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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

            {/* Password Criteria List */}
            {password.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-600">Password requirements:</p>
                {passwordChecks.map((check, index) => (
                  <div key={index} className="flex items-center space-x-2 text-[11px]">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        check.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {check.valid ? '✓' : '•'}
                    </div>
                    <span className={check.valid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700">
                Confirm Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

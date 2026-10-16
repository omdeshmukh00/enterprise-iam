'use client';

import React, { useState } from 'react';
import { api } from '../../lib/api';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordChecks = [
    { label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { label: 'At least one uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'At least one number', valid: /[0-9]/.test(newPassword) },
    { label: 'At least one special character', valid: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const isPasswordValid = passwordChecks.every((c) => c.valid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password complexity criteria.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.user.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSuccessMessage(res.message || 'Password changed successfully. A security notification was dispatched to your email.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security & Password</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account credentials and enterprise authentication security.
        </p>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Change Password Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-500">
              Updating your password will sign out any other active browser sessions.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-xs font-semibold text-slate-700">
              Current Password
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-700">
              New Password
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {newPassword.length > 0 && (
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
              Confirm New Password
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Guidance Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
        <div className="flex items-center space-x-2 text-indigo-700">
          <ShieldCheck className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Enterprise Security Advice</h3>
        </div>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
          <li>Never reuse passwords across personal and enterprise systems.</li>
          <li>IdentityHub passwords are hashed using memory-hard Argon2id algorithms.</li>
          <li>Whenever your password is changed, a security notification email is automatically dispatched.</li>
          <li>Review your active browser sessions regularly under the Active Sessions tab.</li>
        </ul>
      </div>
    </div>
  );
}

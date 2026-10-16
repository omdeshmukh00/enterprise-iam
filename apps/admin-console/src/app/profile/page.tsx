'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { User, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await api.user.updateProfile({ firstName, lastName });
      await refreshUser();
      setSuccessMessage('Profile information successfully updated.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personal Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal information and view account metadata.
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-slate-700">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-xs font-semibold text-slate-700">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Email Address (Primary Identity)
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="mt-1 block w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-md text-sm cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Email cannot be changed directly in this milestone to prevent identity spoofing.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Account Metadata Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Account Details</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="font-medium text-slate-500">Account ID</dt>
            <dd className="font-mono text-slate-700 mt-0.5">{user.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Role</dt>
            <dd className="font-semibold text-slate-700 mt-0.5">{user.role}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Created At</dt>
            <dd className="text-slate-700 mt-0.5">{new Date(user.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Last Login</dt>
            <dd className="text-slate-700 mt-0.5">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

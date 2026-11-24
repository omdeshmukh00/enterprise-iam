'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  User,
  KeyRound,
  Laptop,
  History,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome, {user.firstName} {user.lastName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your centralized enterprise credentials, sessions, and security activity.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Admin Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Account Status Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">IdentityHub Account</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{user.email}</p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                {user.role}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                  user.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {user.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-4 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              user.emailVerified
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}
          >
            {user.emailVerified ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Email Verification</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {user.emailVerified ? 'Verified' : 'Pending Verification'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {user.emailVerifiedAt
                ? `Confirmed on ${new Date(user.emailVerifiedAt).toLocaleDateString()}`
                : 'Check inbox for verification email'}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-4 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Last Authentication</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'First session'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Account created {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-4">Security & Account Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/profile"
            className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Personal Profile
            </h3>
            <p className="text-xs text-slate-500 mt-1">Update your display name and contact preferences.</p>
          </Link>

          <Link
            href="/security"
            className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Security & Password
            </h3>
            <p className="text-xs text-slate-500 mt-1">Change your account password and review protection.</p>
          </Link>

          <Link
            href="/sessions"
            className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Laptop className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Active Sessions
            </h3>
            <p className="text-xs text-slate-500 mt-1">View connected devices and revoke unauthorized access.</p>
          </Link>

          <Link
            href="/activity"
            className="group p-5 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Security Activity
            </h3>
            <p className="text-xs text-slate-500 mt-1">Review recent logins, logouts, and account changes.</p>
          </Link>
        </div>
      </div>

      {/* Connected Applications (First-party CRM & Analytics) */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Connected Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              First-party applications authenticated through IdentityHub.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                CRM
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">IdentityHub Enterprise CRM</h3>
                <p className="text-xs text-slate-500">Port 3001 • Customer & Pipeline Management</p>
              </div>
            </div>
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              <span>Launch CRM</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                DATA
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">IdentityHub Analytics</h3>
                <p className="text-xs text-slate-500">Port 3002 • Security Telemetry & Metrics</p>
              </div>
            </div>
            <a
              href="http://localhost:3002"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              <span>Launch Analytics</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, User, SessionItem, AuditLogItem } from '../../../../lib/api';
import {
  ArrowLeft,
  User as UserIcon,
  Shield,
  Laptop,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../../../../components/Modal';

export default function AdminUserDetailsPage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activity, setActivity] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalAction, setModalAction] = useState<'SUSPEND' | 'ACTIVATE' | 'REVOKE_ALL' | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadUserDetails = useCallback(async () => {
    try {
      const data = await api.admin.getUserDetails(userId);
      setUser(data.user);
      setSessions(data.sessions);
      setActivity(data.activity);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to load user details.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserDetails();
  }, [loadUserDetails]);

  const handleModalConfirm = async () => {
    if (!user || !modalAction) return;
    setIsModalLoading(true);
    setFeedbackMessage(null);

    try {
      if (modalAction === 'SUSPEND' || modalAction === 'ACTIVATE') {
        const newStatus = modalAction === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';
        await api.admin.updateUserStatus(user.id, newStatus);
        setFeedbackMessage(`User status successfully updated to ${newStatus}.`);
      } else if (modalAction === 'REVOKE_ALL') {
        const res = await api.admin.revokeUserSessions(user.id);
        setFeedbackMessage(res.message);
      }
      setModalAction(null);
      await loadUserDetails();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Operation failed.');
    } finally {
      setIsModalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        User account not found.{' '}
        <Link href="/admin/users" className="text-indigo-600 underline">
          Return to user directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/users"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-xs text-slate-500 font-mono">{user.email}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {sessions.length > 0 && (
            <button
              onClick={() => setModalAction('REVOKE_ALL')}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              Revoke All Sessions
            </button>
          )}

          {user.status === 'ACTIVE' ? (
            <button
              onClick={() => setModalAction('SUSPEND')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              Suspend User
            </button>
          ) : (
            <button
              onClick={() => setModalAction('ACTIVATE')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
            >
              Activate User
            </button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center space-x-2 text-indigo-900 text-xs">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Account Overview</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <dt className="font-medium text-slate-500">Account ID</dt>
            <dd className="font-mono text-slate-700 mt-0.5 text-[11px] truncate">{user.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Role</dt>
            <dd className="mt-0.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                {user.role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Account Status</dt>
            <dd className="mt-0.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  user.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {user.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Email Verification</dt>
            <dd className="mt-0.5">
              {user.emailVerified ? (
                <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-amber-700 font-semibold text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unverified</span>
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* User Sessions Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Laptop className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Active Database Sessions</h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{sessions.length} Active</span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No active browser sessions found for this user.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{s.ipAddress || 'Localhost'}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 line-clamp-1">{s.userAgent}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Last active: {new Date(s.lastActiveAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Security Activity Logs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center space-x-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Recent Security Activity</h3>
        </div>

        {activity.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No recent activity logs recorded for this user.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">IP</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activity.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-[11px] text-slate-900">{item.action}</td>
                    <td className="py-2.5 px-4">
                      <span className={`font-semibold text-[11px] ${item.status === 'SUCCESS' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{item.ipAddress || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalAction !== null}
        onClose={() => setModalAction(null)}
        onConfirm={handleModalConfirm}
        title={
          modalAction === 'SUSPEND'
            ? 'Suspend User Account'
            : modalAction === 'ACTIVATE'
            ? 'Activate User Account'
            : 'Revoke All Sessions'
        }
        description={
          modalAction === 'SUSPEND'
            ? `Suspend ${user.email}? The user will immediately be locked out and active sessions terminated.`
            : modalAction === 'ACTIVATE'
            ? `Reactivate ${user.email}? The user will be permitted to authenticate again.`
            : `Revoke all ${sessions.length} active session(s) for ${user.email}?`
        }
        confirmText={
          modalAction === 'SUSPEND' ? 'Suspend' : modalAction === 'ACTIVATE' ? 'Activate' : 'Revoke All'
        }
        isDestructive={modalAction === 'SUSPEND' || modalAction === 'REVOKE_ALL'}
        isLoading={isModalLoading}
      />
    </div>
  );
}

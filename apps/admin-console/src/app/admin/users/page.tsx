'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, User } from '../../../lib/api';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'SUSPEND' | 'ACTIVATE' | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.admin.listUsers({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedUser || !actionType) return;
    setIsActionLoading(true);
    setFeedbackMessage(null);

    const newStatus = actionType === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';

    try {
      await api.admin.updateUserStatus(selectedUser.id, newStatus);
      setFeedbackMessage(
        `User ${selectedUser.email} has been successfully ${
          newStatus === 'SUSPENDED' ? 'suspended' : 'activated'
        }.`
      );
      setSelectedUser(null);
      setActionType(null);
      await loadUsers();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to update user status.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage enterprise user accounts, roles, access statuses, and active sessions.
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center space-x-2 text-indigo-900 text-xs">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </form>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No matching user accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Email Verified</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-700 font-medium text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Unverified</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/admin/users/${u.id}`}
                          title="View user details"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setActionType('SUSPEND');
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setActionType('ACTIVATE');
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded transition-colors"
                          >
                            Activate
                          </button>
                        )}
                      </div>
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
        isOpen={selectedUser !== null && actionType !== null}
        onClose={() => {
          setSelectedUser(null);
          setActionType(null);
        }}
        onConfirm={handleConfirmStatusChange}
        title={actionType === 'SUSPEND' ? 'Suspend User Account' : 'Reactivate User Account'}
        description={
          actionType === 'SUSPEND'
            ? `Are you sure you want to suspend ${selectedUser?.email}? The user will immediately be barred from authenticating and all active sessions will be terminated.`
            : `Are you sure you want to reactivate ${selectedUser?.email}? The user will regain access to authenticate.`
        }
        confirmText={actionType === 'SUSPEND' ? 'Suspend Account' : 'Reactivate Account'}
        isDestructive={actionType === 'SUSPEND'}
        isLoading={isActionLoading}
      />
    </div>
  );
}

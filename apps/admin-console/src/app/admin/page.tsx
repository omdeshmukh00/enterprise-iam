'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, AuditLogItem } from '../../lib/api';
import {
  Users,
  UserCheck,
  UserX,
  History,
  Shield,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    recentAuditLogs: AuditLogItem[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.admin.getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      title: 'Active Accounts',
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Suspended Accounts',
      value: stats?.suspendedUsers ?? 0,
      icon: UserX,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-100',
    },
    {
      title: 'Recent Audit Events',
      value: stats?.recentAuditLogs?.length ?? 0,
      icon: History,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">
              Admin Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            IdentityHub Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time identity metrics, directory management, and system security logs.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
        >
          <span>Manage Users</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-lg border flex items-center justify-center ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent System Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Authentication & Security Events</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit events streamed directly from database activity.
            </p>
          </div>
          <Link
            href="/admin/activity"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all logs →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {stats?.recentAuditLogs?.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No events recorded yet.</div>
          ) : (
            stats?.recentAuditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {log.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">{log.action}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName} (${log.actor.email})` : 'System / Anonymous'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-1">
                      <span>IP: {log.ipAddress || '—'}</span>
                      <span>•</span>
                      <span className="max-w-xs truncate">{log.userAgent || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

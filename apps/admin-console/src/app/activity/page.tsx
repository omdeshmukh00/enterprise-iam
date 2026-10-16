'use client';

import React, { useEffect, useState } from 'react';
import { api, AuditLogItem } from '../../lib/api';
import { History, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function ActivityPage() {
  const [activity, setActivity] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const data = await api.user.getActivity(50);
        setActivity(data.activity);
      } catch (err) {
        console.error('Failed to load user activity', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, []);

  const getActionBadge = (action: string) => {
    const isSecurity = action.includes('PASSWORD') || action.includes('REVOKED');
    const isSuccess = !action.includes('FAILED');

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
          isSecurity
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : isSuccess
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}
      >
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security Activity</h1>
        <p className="text-xs text-slate-500 mt-1">
          Real database audit trail tracking authentication, sessions, and security actions.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : activity.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
          No security events recorded for this account yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Event Action</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Browser / Client</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {activity.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">{getActionBadge(item.action)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        {item.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                        <span className="font-semibold text-[11px]">{item.status}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {item.ipAddress || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                      {item.userAgent || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

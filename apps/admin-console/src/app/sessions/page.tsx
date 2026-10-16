'use client';

import React, { useEffect, useState } from 'react';
import { api, SessionItem } from '../../lib/api';
import { Laptop, Trash2, CheckCircle2, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { Modal } from '../../components/Modal';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isRevokeAllOpen, setIsRevokeAllOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadSessions = async () => {
    try {
      const data = await api.user.getSessions();
      setSessions(data.sessions);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load active sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSingle = async () => {
    if (!selectedSessionId) return;
    setIsActionLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await api.user.revokeSession(selectedSessionId);
      setStatusMessage('Session was successfully revoked.');
      setSelectedSessionId(null);
      await loadSessions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revoke session.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRevokeAllOther = async () => {
    setIsActionLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      // Find other sessions and revoke each
      const otherSessions = sessions.filter((s) => !s.isCurrent);
      for (const s of otherSessions) {
        await api.user.revokeSession(s.id);
      }
      setStatusMessage(`Revoked ${otherSessions.length} other active session(s).`);
      setIsRevokeAllOpen(false);
      await loadSessions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to revoke other sessions.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Active Sessions</h1>
          <p className="text-xs text-slate-500 mt-1">
            Database-backed browser sessions currently active for your IdentityHub identity.
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={() => setIsRevokeAllOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-md shadow-sm transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out all other sessions</span>
          </button>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-emerald-800 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {sessions.map((session) => (
            <div key={session.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 mt-0.5">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {session.ipAddress || 'Local Network'}
                    </p>
                    {session.isCurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Current Session
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5 line-clamp-1 max-w-md">
                    {session.userAgent || 'Standard Browser'}
                  </p>
                  <div className="flex items-center space-x-4 text-[11px] text-slate-400 mt-2">
                    <span>Last active: {new Date(session.lastActiveAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>Created: {new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {!session.isCurrent && (
                <button
                  onClick={() => setSelectedSessionId(session.id)}
                  title="Revoke session"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Revoke Single Session Modal */}
      <Modal
        isOpen={selectedSessionId !== null}
        onClose={() => setSelectedSessionId(null)}
        onConfirm={handleRevokeSingle}
        title="Revoke Session"
        description="Are you sure you want to revoke this session? The device will immediately be signed out of IdentityHub."
        confirmText="Revoke Session"
        isDestructive={true}
        isLoading={isActionLoading}
      />

      {/* Revoke All Other Sessions Modal */}
      <Modal
        isOpen={isRevokeAllOpen}
        onClose={() => setIsRevokeAllOpen(false)}
        onConfirm={handleRevokeAllOther}
        title="Sign Out Other Sessions"
        description="This action will terminate all other active browser sessions for your account except this current one."
        confirmText="Sign Out Other Sessions"
        isDestructive={true}
        isLoading={isActionLoading}
      />
    </div>
  );
}

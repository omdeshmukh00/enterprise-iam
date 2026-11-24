'use client';

import React, { useState } from 'react';
import { useAnalyticsAuth } from '../context/AnalyticsAuthContext';
import {
  BarChart3,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Users,
  KeyRound,
  Globe,
  Server,
  LogOut,
  Shield,
  Loader2,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  TrendingUp,
  Cpu,
} from 'lucide-react';

export default function AnalyticsDashboardPage() {
  const { user, isLoading, logout } = useAnalyticsAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'auth_events' | 'security' | 'performance'>('overview');

  React.useEffect(() => {
    if (!isLoading && !user) {
      window.location.replace('/login');
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Checking enterprise telemetry authorization...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center max-w-sm w-full space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-900">Redirecting to Sign In...</p>
          <a
            href="/login"
            className="inline-block w-full py-2 px-4 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            Continue to Sign In
          </a>
        </div>
      </div>
    );
  }

  const recentAuthEvents = [
    { id: 1, user: user.email, event: 'SSO Login via Authorization Code PKCE', client: 'IdentityHub Analytics', status: 'SUCCESS', ip: '127.0.0.1', time: 'Just now' },
    { id: 2, user: 'sarah.connor@enterprise.io', event: 'OIDC Token Refresh', client: 'IdentityHub CRM', status: 'SUCCESS', ip: '192.168.1.45', time: '4 mins ago' },
    { id: 3, user: 'david.miller@enterprise.io', event: 'Session Revocation', client: 'IdentityHub Admin Console', status: 'SUCCESS', ip: '192.168.1.88', time: '12 mins ago' },
    { id: 4, user: 'unknown@external.net', event: 'Failed Password Challenge', client: 'Identity Server Direct', status: 'FAILED', ip: '203.0.113.195', time: '28 mins ago' },
    { id: 5, user: 'elena.rostova@enterprise.io', event: 'MFA Verification Complete', client: 'IdentityHub CRM', status: 'SUCCESS', ip: '10.0.4.12', time: '45 mins ago' },
  ];

  const appUsages = [
    { name: 'Admin Console (Port 3000)', share: '32%', activeSessions: 420, status: 'Healthy', latency: '42ms' },
    { name: 'CRM Client (Port 3001)', share: '46%', activeSessions: 610, status: 'Healthy', latency: '38ms' },
    { name: 'Analytics Client (Port 3002)', share: '18%', activeSessions: 240, status: 'Healthy', latency: '29ms' },
    { name: 'HR Client (Port 3003)', share: '4%', activeSessions: 52, status: 'Standby', latency: 'N/A' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-sm">IdentityHub Analytics</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'auth_events', label: 'Auth Events', icon: Activity },
                { key: 'security', label: 'Security & Risk', icon: ShieldCheck },
                { key: 'performance', label: 'Performance', icon: Cpu },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Authenticated IdentityHub User & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end space-x-1.5">
                <span className="text-xs font-bold text-slate-900">
                  {user.firstName} {user.lastName}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 uppercase">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-end space-x-1 text-[11px] text-slate-500 font-medium">
                <Shield className="w-3 h-3 text-indigo-600 inline" />
                <span>Authenticated by IdentityHub</span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign out from Analytics"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs font-semibold rounded-md shadow-sm transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Welcome Identity Banner */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                Connected First-Party Application
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Port 3002 • Session Active</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome to Analytics & Telemetry, {user.firstName}
            </h1>
            <p className="text-xs text-slate-500">
              Your identity is provided by <strong>IdentityHub IAM</strong> ({user.email}). High-resolution authentication and access observability.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href="http://localhost:3000/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span>Manage IdentityHub Account</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">Active SSO Sessions</p>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">1,322</p>
                <div className="flex items-center text-[11px] text-emerald-600 font-semibold mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  <span>+18.4% vs last week</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">Daily Token Grants</p>
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">14,890</p>
                <div className="flex items-center text-[11px] text-emerald-600 font-semibold mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  <span>99.94% issuance rate</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">Avg Token Verification</p>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">1.8 ms</p>
                <div className="flex items-center text-[11px] text-indigo-600 font-semibold mt-1">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  <span>Argon2id + Redis cache</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">Risk & Anomaly Rate</p>
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 mt-2">0.02%</p>
                <div className="flex items-center text-[11px] text-emerald-600 font-semibold mt-1">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  <span>-0.08% threat mitigation</span>
                </div>
              </div>
            </div>

            {/* Application Distribution Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">OAuth Client Traffic & Session Allocation</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Distribution of authenticated sessions across enterprise clients.</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">4 Registered Endpoints</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Client Application</th>
                      <th className="py-2.5 px-4">Traffic Share</th>
                      <th className="py-2.5 px-4">Concurrent Sessions</th>
                      <th className="py-2.5 px-4">Health Status</th>
                      <th className="py-2.5 px-4">Avg Gateway Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {appUsages.map((app) => (
                      <tr key={app.name} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{app.name}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full"
                                style={{ width: app.share }}
                              ></div>
                            </div>
                            <span className="font-mono text-slate-600">{app.share}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{app.activeSessions}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              app.status === 'Healthy'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{app.latency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Auth Telemetry Stream */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Real-Time Authentication Stream</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Live token exchange and grant stream across ports 3000, 3001, 3002.</p>
                </div>
                <button
                  onClick={() => setActiveTab('auth_events')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View full log →
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {recentAuthEvents.map((event) => (
                  <div key={event.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          event.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {event.status === 'SUCCESS' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900">{event.event}</span>
                          <span className="text-[10px] text-slate-400">• {event.client}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5 font-mono text-[11px]">{event.user} (from {event.ip})</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          event.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {event.status}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Auth Events */}
        {activeTab === 'auth_events' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Authentication Event Log</h3>
                <p className="text-xs text-slate-500 mt-0.5">Complete audit log of token grants, logins, and revocations.</p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">{recentAuthEvents.length} Recent Records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Subject (User)</th>
                    <th className="py-2.5 px-4">Event Type</th>
                    <th className="py-2.5 px-4">Client Application</th>
                    <th className="py-2.5 px-4">Origin IP</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {recentAuthEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{evt.time}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{evt.user}</td>
                      <td className="py-3 px-4 text-slate-700">{evt.event}</td>
                      <td className="py-3 px-4 text-slate-500">{evt.client}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{evt.ip}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            evt.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Risk */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Security Telemetry Parameters</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Cookie Domain Partitioning</p>
                    <p className="text-slate-500 text-[11px]">Strict cookie names prevent cross-app session contamination</p>
                  </div>
                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    ISOLATED
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">PKCE (Proof Key for Code Exchange)</p>
                    <p className="text-slate-500 text-[11px]">S256 code challenge enforced for public clients</p>
                  </div>
                  <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    ENFORCED
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Argon2id Hash Work Factor</p>
                    <p className="text-slate-500 text-[11px]">64MB memory cost, 3 iterations, 1 parallelism</p>
                  </div>
                  <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">
                    OPTIMAL
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Access Origins & CORS Boundaries</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 border border-slate-100 rounded flex justify-between items-center">
                  <span className="font-mono text-slate-700">http://localhost:3000</span>
                  <span className="text-slate-500">Admin Console</span>
                </div>
                <div className="p-2.5 border border-slate-100 rounded flex justify-between items-center">
                  <span className="font-mono text-slate-700">http://localhost:3001</span>
                  <span className="text-slate-500">CRM Client</span>
                </div>
                <div className="p-2.5 border border-slate-100 rounded flex justify-between items-center bg-indigo-50/50 border-indigo-200">
                  <span className="font-mono text-indigo-700 font-semibold">http://localhost:3002</span>
                  <span className="text-indigo-600 font-semibold">Analytics Client (Active)</span>
                </div>
                <div className="p-2.5 border border-slate-100 rounded flex justify-between items-center text-slate-400">
                  <span className="font-mono">http://localhost:3003</span>
                  <span>HR Client (Standby)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Performance */}
        {activeTab === 'performance' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">IAM Cluster Performance Benchmarks</h3>
              <p className="text-xs text-slate-500 mt-0.5">Latency and throughput profiles across IdentityHub microservices.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500">OAuth /token Endpoint</p>
                <p className="text-xl font-bold text-slate-900 mt-1">14.2 ms</p>
                <p className="text-[11px] text-slate-400 mt-1">p99 &lt; 28 ms</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500">Session Validation Cache</p>
                <p className="text-xl font-bold text-slate-900 mt-1">0.4 ms</p>
                <p className="text-[11px] text-slate-400 mt-1">In-memory SHA-256 lookup</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-semibold text-slate-500">PostgreSQL Connection Pool</p>
                <p className="text-xl font-bold text-slate-900 mt-1">2 / 20 Active</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Healthy connection state</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

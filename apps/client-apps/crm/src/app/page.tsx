'use client';

import React, { useState } from 'react';
import { useCrmAuth } from '../context/CrmAuthContext';
import {
  Building2,
  Users,
  Briefcase,
  CheckSquare,
  LogOut,
  Shield,
  Search,
  Plus,
  Loader2,
  ExternalLink,
} from 'lucide-react';

export default function CrmDashboardPage() {
  const { user, isLoading, logout } = useCrmAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'projects' | 'tasks'>('overview');

  React.useEffect(() => {
    if (!isLoading && !user) {
      window.location.replace('/login');
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Checking enterprise authorization...</p>
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

  const customers = [
    { id: 1, name: 'Acme Corporation', industry: 'Enterprise SaaS', status: 'Active Client', revenue: '$120,000', contact: 'sarah@acme.com' },
    { id: 2, name: 'Globex Logistics', industry: 'Supply Chain', status: 'In Negotiation', revenue: '$85,000', contact: 'david@globex.io' },
    { id: 3, name: 'Soylent Health', industry: 'Biotech', status: 'Active Client', revenue: '$210,000', contact: 'elena@soylent.org' },
    { id: 4, name: 'Initech Systems', industry: 'Financial IT', status: 'Prospect', revenue: '$45,000', contact: 'peter@initech.net' },
  ];

  const projects = [
    { id: 1, name: 'Q4 Enterprise Cloud Migration', client: 'Acme Corporation', progress: 75, due: 'Dec 15, 2026' },
    { id: 2, name: 'API Gateway Modernization', client: 'Soylent Health', progress: 40, due: 'Jan 20, 2027' },
    { id: 3, name: 'IAM Single Sign-On Integration', client: 'Globex Logistics', progress: 90, due: 'Nov 30, 2026' },
  ];

  const tasks = [
    { id: 1, title: 'Security review with Acme IT leadership', priority: 'High', due: 'Tomorrow', done: false },
    { id: 2, title: 'Draft MSA contract for Globex Logistics', priority: 'Medium', due: 'Friday', done: true },
    { id: 3, title: 'Schedule demonstration for Initech stakeholders', priority: 'Urgent', due: 'Today', done: false },
    { id: 4, title: 'Follow-up on onboarding telemetry report', priority: 'Low', due: 'Next week', done: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Application Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight text-sm">IdentityHub CRM</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              {[
                { key: 'overview', label: 'Overview', icon: Building2 },
                { key: 'customers', label: 'Customers', icon: Users },
                { key: 'projects', label: 'Projects', icon: Briefcase },
                { key: 'tasks', label: 'Tasks', icon: CheckSquare },
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
              title="Sign out from CRM"
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
              <span className="text-[11px] text-slate-400 font-mono">Session ID Active</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome to CRM, {user.firstName}
            </h1>
            <p className="text-xs text-slate-500">
              Your identity is provided by <strong>IdentityHub IAM</strong> ({user.email}). Single Sign-On credentials managed centrally.
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
                <p className="text-xs font-medium text-slate-500">Total Pipeline Value</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">$460,000</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">↑ 14% vs last quarter</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Active Enterprise Accounts</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">4 Accounts</p>
                <p className="text-[11px] text-slate-500 mt-1">2 in closing stages</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Active Implementation Projects</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">3 Projects</p>
                <p className="text-[11px] text-indigo-600 font-semibold mt-1">All on schedule</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Pending Action Items</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">3 Urgent Tasks</p>
                <p className="text-[11px] text-amber-600 font-semibold mt-1">Requires user attention</p>
              </div>
            </div>

            {/* Recent Customers Overview Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Key Enterprise Accounts</h3>
                <button
                  onClick={() => setActiveTab('customers')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View directory →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Client Name</th>
                      <th className="py-2.5 px-4">Industry</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Contract Value</th>
                      <th className="py-2.5 px-4">Primary Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-3 px-4 text-slate-500">{c.industry}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.revenue}</td>
                        <td className="py-3 px-4 text-slate-500 font-mono">{c.contact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Customers */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Customer Directory</h3>
              <span className="text-xs text-slate-500 font-semibold">{customers.length} Accounts</span>
            </div>
            <div className="divide-y divide-slate-100">
              {customers.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                    <p className="text-slate-500 mt-0.5">{c.industry} • Contact: {c.contact}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">{c.revenue}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Projects */}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Active CRM Projects</h3>
              <span className="text-xs text-slate-500 font-semibold">{projects.length} Ongoing</span>
            </div>
            <div className="divide-y divide-slate-100">
              {projects.map((p) => (
                <div key={p.id} className="p-4 space-y-2 hover:bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                    <span className="text-slate-500 font-medium">Due {p.due}</span>
                  </div>
                  <p className="text-xs text-slate-500">Client: {p.client}</p>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${p.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400 text-right">{p.progress}% Completed</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Tasks */}
        {activeTab === 'tasks' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">CRM Pipeline Tasks</h3>
              <span className="text-xs text-slate-500 font-semibold">{tasks.length} Total</span>
            </div>
            <div className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      defaultChecked={t.done}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`font-medium ${t.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {t.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'Urgent'
                          ? 'bg-red-100 text-red-800'
                          : t.priority === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-slate-400 text-[11px]">{t.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

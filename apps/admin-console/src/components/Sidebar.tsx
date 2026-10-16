'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LayoutDashboard,
  User,
  KeyRound,
  Laptop,
  History,
  Users,
  FileText,
  Settings,
  LogOut,
  ShieldAlert,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  if (!user) return null;

  const userNav = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Security & Password', href: '/security', icon: KeyRound },
    { name: 'Active Sessions', href: '/sessions', icon: Laptop },
    { name: 'Security Activity', href: '/activity', icon: History },
  ];

  const adminNav = [
    { name: 'Admin Overview', href: '/admin', icon: Shield },
    { name: 'User Directory', href: '/admin/users', icon: Users },
    { name: 'Audit Logs', href: '/admin/activity', icon: FileText },
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">IdentityHub</h1>
          <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-1">Enterprise IAM</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Account Management
          </p>
          <nav className="space-y-1">
            {userNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div>
            <div className="px-3 flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                Administration
              </p>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                ADMIN
              </span>
            </div>
            <nav className="space-y-1">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

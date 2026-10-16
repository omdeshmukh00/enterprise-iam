'use client';

import React, { useEffect, useState } from 'react';
import { identityhub } from '../../lib/identityhub';
import { Shield, ArrowRight, Building2, Lock, AlertCircle } from 'lucide-react';

export default function CrmLoginPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error') || params.get('error_description');
      if (error) {
        setErrorMsg(decodeURIComponent(error));
      }
    }
  }, []);

  const handleContinueWithIdentityHub = () => {
    window.location.href = identityhub.getLoginUrl('http://localhost:3001');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-sm">
          <Building2 className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Enterprise CRM
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Customer Pipeline and Account Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10 space-y-6 text-center">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              Sign in to your CRM workspace
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This application is protected by enterprise Single Sign-On. Authenticate with your organization identity to continue.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleContinueWithIdentityHub}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Shield className="w-4 h-4 mr-2" />
              <span>Continue with IdentityHub</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
            <Lock className="w-3.5 h-3.5" />
            <span>IdentityHub Authentication Integration</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { AppLayout } from '../components/AppLayout';

export const metadata: Metadata = {
  title: 'IdentityHub — Enterprise Identity & Access Management',
  description: 'Centralized enterprise identity, sessions, and access control platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}

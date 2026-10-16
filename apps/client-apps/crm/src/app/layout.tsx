import './globals.css';
import type { Metadata } from 'next';
import { CrmAuthProvider } from '../context/CrmAuthContext';

export const metadata: Metadata = {
  title: 'IdentityHub CRM — Enterprise Customer Management',
  description: 'First-party enterprise CRM application integrated with IdentityHub authentication.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <CrmAuthProvider>{children}</CrmAuthProvider>
      </body>
    </html>
  );
}

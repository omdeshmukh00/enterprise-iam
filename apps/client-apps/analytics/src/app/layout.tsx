import './globals.css';
import type { Metadata } from 'next';
import { AnalyticsAuthProvider } from '../context/AnalyticsAuthContext';

export const metadata: Metadata = {
  title: 'IdentityHub Analytics — Enterprise Intelligence & Telemetry',
  description: 'First-party enterprise analytics application integrated with IdentityHub authentication.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <AnalyticsAuthProvider>{children}</AnalyticsAuthProvider>
      </body>
    </html>
  );
}

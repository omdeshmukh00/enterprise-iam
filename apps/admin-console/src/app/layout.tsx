import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IdentityHub Admin Console',
  description: 'Enterprise IAM Management Console',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

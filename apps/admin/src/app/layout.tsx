import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '../context/notification-context';

export const metadata: Metadata = {
  title: 'Palnadu Smart Pricing | Administration Portal',
  description: 'Private authenticated administration portal for Smart Pricing.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}

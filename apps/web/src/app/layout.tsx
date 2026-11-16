import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { NotificationProvider } from '../context/notification-context';

export const metadata: Metadata = {
  title: 'Palnadu Smart Pricing | Commercial Products & Quotations',
  description:
    'Authoritative commercial equipment catalogue, specifications, and quotation discovery.',
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

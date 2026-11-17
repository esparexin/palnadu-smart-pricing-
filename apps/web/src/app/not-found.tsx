import React from 'react';
import Link from 'next/link';
import { StorefrontHeader } from '../components/storefront/storefront-header';
import { StorefrontFooter } from '../components/storefront/storefront-footer';

export default function WebNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-md text-center">
          <p className="font-mono text-sm font-bold uppercase tracking-wider text-blue-600">
            404 Error
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Page Not Found
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            The commercial equipment, category, or page you requested could not be located.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Browse Catalogue
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </main>
      <StorefrontFooter />
    </div>
  );
}

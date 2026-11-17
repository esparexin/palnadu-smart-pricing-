import React from 'react';
import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 text-center">
      <div className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xl">
          404
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Admin Page Not Found</h1>
        <p className="text-sm text-slate-600">
          The administrative module or resource you requested does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/admin"
            className="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-sm text-white shadow-sm hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

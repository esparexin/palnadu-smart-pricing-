'use client';

import React from 'react';
import Link from 'next/link';

export default function WebError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <div className="max-w-md">
        <p className="font-mono text-sm font-bold uppercase tracking-wider text-rose-600">
          Application Error
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          An unexpected error occurred while loading this page.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Return to Catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}

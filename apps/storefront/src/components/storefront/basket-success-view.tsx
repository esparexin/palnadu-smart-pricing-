'use client';

import React from 'react';
import Link from 'next/link';

export interface BasketSuccessViewProps {
  referenceNumber: string;
  createdAt: string;
  deliveryStatus?: string;
  onNewEnquiry: () => void;
}

export function BasketSuccessView({
  referenceNumber,
  createdAt,
  deliveryStatus,
  onNewEnquiry,
}: BasketSuccessViewProps) {
  const formattedDate = new Date(createdAt).toLocaleString();

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
        Quotation Request Submitted
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Your quotation enquiry has been logged into our commercial pricing system.
      </p>

      {/* Reference Card */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Official Reference Number
        </div>
        <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-blue-600 select-all">
          {referenceNumber}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Logged at: <span className="font-medium text-slate-700">{formattedDate}</span>
        </div>
      </div>

      {deliveryStatus === 'failed' && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-800">
          <div className="font-bold uppercase tracking-wider text-amber-900 mb-1">
            Delivery Notice
          </div>
          <p className="leading-relaxed">
            Automated messaging could not be dispatched at this time. However, your quotation
            enquiry is safely registered under reference{' '}
            <strong className="font-mono text-amber-950">{referenceNumber}</strong>, and our
            commercial desk will follow up with your quotation estimate directly.
          </p>
        </div>
      )}

      {/* Next Steps */}
      <div className="mt-6 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-5 text-left text-xs text-slate-700">
        <div className="font-bold uppercase tracking-wider text-blue-900">Next Steps:</div>
        <ul className="list-disc space-y-1.5 pl-4 text-slate-600">
          <li>
            Our sales engineering team is evaluating your requested items, quantity brackets, and
            destination logistics.
          </li>
          <li>
            An itemised quotation estimate will be delivered to your contact info. Final commercial
            pricing and terms will be confirmed during quotation discussion.
          </li>
          <li>
            Please quote reference number{' '}
            <strong className="font-mono text-slate-900">{referenceNumber}</strong> when contacting
            our customer desk.
          </li>
        </ul>
      </div>

      {/* Action Navigation */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onNewEnquiry}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Submit Another Request
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Return to Commercial Catalogue
        </Link>
      </div>
    </section>
  );
}

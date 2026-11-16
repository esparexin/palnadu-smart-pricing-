'use client';

import React from 'react';
import type { AdminQuotationDetail, QuotationStatus } from '@palnadu/contracts';

export interface QuotationStatusBarProps {
  quotation: AdminQuotationDetail;
  actionLoading: boolean;
  onStatusChange: (status: QuotationStatus) => void;
}

export function QuotationStatusBar({
  quotation,
  actionLoading,
  onStatusChange,
}: QuotationStatusBarProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Current Lifecycle State
        </div>
        <div className="mt-1 flex items-center gap-3">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            {quotation.status}
          </span>
          <span className="text-xs text-slate-500">
            Logged: {new Date(quotation.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quotation.status === 'submitted' && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onStatusChange('draft')}
            className="touch-target rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Move to Draft
          </button>
        )}
        {['submitted', 'draft'].includes(quotation.status) && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onStatusChange('issued')}
            className="touch-target rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Issue Official Quotation
          </button>
        )}
        {quotation.status === 'issued' && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onStatusChange('delivered')}
            className="touch-target rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Mark as Delivered
          </button>
        )}
        {quotation.status !== 'rejected' && quotation.status !== 'delivered' && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onStatusChange('rejected')}
            className="touch-target rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Reject
          </button>
        )}
      </div>
    </section>
  );
}

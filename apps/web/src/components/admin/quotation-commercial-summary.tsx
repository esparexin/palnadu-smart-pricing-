'use client';

import React, { useEffect, useState } from 'react';
import type { AdminQuotationDetail } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function QuotationCommercialSummary() {
  const [quotations, setQuotations] = useState<AdminQuotationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiClient.quotations
      .listQuotations({ limit: 100, offset: 0 })
      .then((res) => {
        if (isMounted) {
          setQuotations(res.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Governance rule: Exclude drafts and unissued requests ('submitted', 'draft', 'rejected')
  const issuedQuotations = quotations.filter(
    (q) => q.status === 'issued' || q.status === 'delivered',
  );
  const totalIssuedCount = issuedQuotations.length;
  const totalQuotationValuePaise = issuedQuotations.reduce(
    (sum, q) => sum + (q.grandTotalPaise || 0),
    0,
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-semibold text-base text-slate-900">
            Commercial Summary &amp; Quotation Metrics
          </h2>
          <p className="text-xs text-slate-500">
            Official quotation estimates issued to prospective commercial clients.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-xs text-blue-700 border border-blue-200">
          Commercial Estimates Only
        </span>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
        <strong>Governance Requirement:</strong> Metrics represent non-binding commercial estimates
        calculated from issued quotation snapshots only. Drafts and unissued requests are strictly
        excluded. Totals must never be classified as sales, revenue, turnover, confirmed orders, or
        conversion.
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading quotation metrics...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Quotations / Estimates Issued
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold text-2xl text-slate-900">{totalIssuedCount}</span>
              <span className="text-xs text-slate-500">
                (from {quotations.length} total enquiries)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Drafts ({quotations.filter((q) => q.status === 'draft').length}) and unissued
              enquiries ({quotations.filter((q) => q.status === 'submitted').length}) excluded.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Quotation Value (Issued)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold text-2xl text-blue-700">
                {formatCurrency(totalQuotationValuePaise)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Binding only upon contract execution; unverified purchases are excluded from revenue.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

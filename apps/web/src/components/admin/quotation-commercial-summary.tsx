'use client';

import React, { useEffect, useState } from 'react';
import type { QuotationMetricsResponse } from '@palnadu/contracts';
import { apiClient } from '../../lib/api-client';

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function QuotationCommercialSummary() {
  const [metrics, setMetrics] = useState<QuotationMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiClient.quotations
      .getMetrics()
      .then((res) => {
        if (isMounted) {
          setMetrics(res);
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="font-semibold text-base text-slate-900">
            Quotation Request &amp; Delivery Summary
          </h2>
          <p className="text-xs text-slate-500">
            Automated estimates delivered to prospective commercial clients.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-xs text-blue-700 border border-blue-200">
          Commercial Estimates Only
        </span>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
        <strong>Governance Requirement:</strong> Metrics represent non-binding commercial estimates
        only. Totals must never be classified as sales, revenue, turnover, confirmed orders, or
        conversion. Top products are ranked strictly by distinct submitted requests.
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-slate-400">Loading quotation metrics...</div>
      ) : metrics ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Requests Received
              </span>
              <div className="mt-2 font-bold text-2xl text-slate-900">
                {metrics.totalRequestsReceived}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Distinct submitted requests.</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Quotations Generated
              </span>
              <div className="mt-2 font-bold text-2xl text-slate-900">
                {metrics.totalQuotationsGenerated}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Automated price calculations.</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <span className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Quotation Value
              </span>
              <div className="mt-2 font-bold text-2xl text-blue-700">
                {formatCurrency(metrics.totalQuotationValuePaise)}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Estimated value (non-sales).</p>
            </div>
          </div>

          {metrics.frequentlyRequestedProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h3 className="font-semibold text-xs text-slate-700 uppercase tracking-wider mb-2">
                Frequently Requested Products
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2 text-right">Distinct Requests</th>
                      <th className="px-3 py-2 text-right">Requested Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.frequentlyRequestedProducts.map((p) => (
                      <tr key={p.productId}>
                        <td className="px-3 py-2 font-medium text-slate-900">{p.productName}</td>
                        <td className="px-3 py-2 text-right text-slate-600 font-mono">
                          {p.distinctRequestCount}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 font-mono">
                          {p.totalRequestedQuantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400">No metrics available.</div>
      )}
    </div>
  );
}

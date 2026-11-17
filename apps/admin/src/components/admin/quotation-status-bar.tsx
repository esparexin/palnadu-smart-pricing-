'use client';

import React from 'react';
import type { AdminQuotationDetail, QuotationStatus } from '@palnadu/contracts';

export interface QuotationStatusBarProps {
  quotation: AdminQuotationDetail;
  actionLoading: boolean;
  onStatusChange: (status: QuotationStatus) => void;
  onRetryDelivery?: () => void;
}

export function QuotationStatusBar({
  quotation,
  actionLoading,
  onStatusChange,
  onRetryDelivery,
}: QuotationStatusBarProps) {
  const getDeliveryBadge = (status: AdminQuotationDetail['deliveryStatus']) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quotation Lifecycle State
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
          {quotation.customerPhone &&
            onRetryDelivery &&
            quotation.deliveryStatus !== 'delivered' && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={onRetryDelivery}
                className="touch-target rounded-lg border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100 disabled:opacity-50"
              >
                Retry WhatsApp Delivery
              </button>
            )}
          {quotation.status !== 'rejected' && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => onStatusChange('rejected')}
              className="touch-target rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Reject Request
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">WhatsApp Automation Delivery:</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getDeliveryBadge(
              quotation.deliveryStatus,
            )}`}
          >
            {quotation.deliveryStatus}
          </span>
          {quotation.deliveryProviderId && (
            <span className="font-mono text-slate-500">ID: {quotation.deliveryProviderId}</span>
          )}
        </div>
        {quotation.deliveryError && (
          <div className="text-red-600 font-medium">Error: {quotation.deliveryError}</div>
        )}
      </div>
    </section>
  );
}

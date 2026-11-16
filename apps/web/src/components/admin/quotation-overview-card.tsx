import React from 'react';
import type { AdminQuotationDetail } from '@palnadu/contracts';

function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export interface QuotationOverviewCardProps {
  quotation: AdminQuotationDetail;
}

export function QuotationOverviewCard({ quotation }: QuotationOverviewCardProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Customer Details</h2>
        <div className="text-sm font-medium text-slate-900">{quotation.customerName}</div>
        <div className="space-y-1 text-xs text-slate-600">
          {quotation.customerEmail && <div>Email: {quotation.customerEmail}</div>}
          {quotation.customerPhone && <div>Phone: {quotation.customerPhone}</div>}
        </div>
        {quotation.customerNotes && (
          <div className="mt-2 rounded bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-100 whitespace-pre-line">
            {quotation.customerNotes}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Commercial Financial Summary</h2>
        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-3">
          <div>
            <div className="text-xs text-slate-500">Gross Subtotal</div>
            <div className="font-mono text-base font-semibold text-slate-900">
              {formatInr(quotation.subtotalPaise)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Product Line Discounts</div>
            <div className="font-mono text-base font-semibold text-emerald-600">
              -{formatInr(quotation.discountTotalPaise)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Quotation Grand Total</div>
            <div className="font-mono text-lg font-black text-blue-600">
              {formatInr(quotation.grandTotalPaise)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

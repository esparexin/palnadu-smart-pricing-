'use client';

import React from 'react';
import type { AdminQuotationDetail, CompanyProfile } from '@palnadu/contracts';
import {
  formatInr,
  QuotationBillTo,
  QuotationDocumentHeader,
  QuotationFooter,
  QuotationTotals,
} from './quotation-document-sections';

export interface QuotationDocumentProps {
  quotation: AdminQuotationDetail;
  companyProfile: CompanyProfile | null;
}

export function QuotationDocument({ quotation, companyProfile }: QuotationDocumentProps) {
  const profile = quotation.companySnapshot ?? companyProfile;

  return (
    <div className="space-y-4">
      {/* Action Header - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Quotation Document Preview</h2>
          <p className="text-xs text-slate-500">
            Official printable document using{' '}
            {quotation.companySnapshot ? 'persisted issued snapshot' : 'live company profile'}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="touch-target inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print / Save PDF
        </button>
      </div>

      {/* The Printable Page */}
      <div className="quotation-print-page mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm print:border-none print:shadow-none print:p-0">
        <QuotationDocumentHeader profile={profile} quotation={quotation} />
        <QuotationBillTo quotation={quotation} />

        {/* Itemized Table */}
        <div className="my-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b-2 border-slate-300 bg-slate-100 font-bold uppercase text-slate-700">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Item & Specifications</th>
                <th className="py-2.5 px-2 text-center">Unit</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Rate</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">Net Price</th>
                <th className="py-2.5 px-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {quotation.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {item.variantModel ? `Variant: ${item.variantModel}` : null}
                      {item.sku ? ` | SKU: ${item.sku}` : null}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-600">{item.unit}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {formatInr(item.offerPricePaise || item.mrpPaise)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {item.discountAmountPaise > 0 ? `-${formatInr(item.discountAmountPaise)}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                    {formatInr(item.finalUnitPricePaise)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatInr(item.lineTotalPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <QuotationTotals quotation={quotation} />
        <QuotationFooter profile={profile} />
      </div>
    </div>
  );
}

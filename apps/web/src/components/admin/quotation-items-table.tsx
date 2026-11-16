'use client';

import React from 'react';
import type { QuotationLineItemDto } from '@palnadu/contracts';

export interface QuotationItemsTableProps {
  items: QuotationLineItemDto[];
}

function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function QuotationItemsTable({ items }: QuotationItemsTableProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900 mb-4">Itemized Products ({items.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase text-slate-900">
            <tr>
              <th className="px-3 py-2.5">Product & Model</th>
              <th className="px-3 py-2.5 text-center">Unit</th>
              <th className="px-3 py-2.5 text-center">Qty</th>
              <th className="px-3 py-2.5 text-right">Offer Price</th>
              <th className="px-3 py-2.5 text-right">Discount</th>
              <th className="px-3 py-2.5 text-right">Net Unit Price</th>
              <th className="px-3 py-2.5 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <div className="font-semibold text-slate-900">{item.productName}</div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {item.variantModel || item.sku || 'Standard'}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center text-slate-600">{item.unit}</td>
                <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                  {item.quantity}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {formatInr(item.offerPricePaise)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-emerald-600">
                  {item.discountAmountPaise > 0 ? `-${formatInr(item.discountAmountPaise)}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-medium text-slate-900">
                  {formatInr(item.finalUnitPricePaise)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                  {formatInr(item.lineTotalPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

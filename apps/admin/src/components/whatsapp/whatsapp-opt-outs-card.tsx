'use client';

import React from 'react';
import type { WhatsAppOptOutListItem } from '@palnadu/contracts';

export interface WhatsAppOptOutsCardProps {
  optOuts: WhatsAppOptOutListItem[];
}

export function WhatsAppOptOutsCard({ optOuts }: WhatsAppOptOutsCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base text-slate-900">Opt-Out &amp; Consent Registry</h3>
          <p className="text-xs text-slate-500">
            Customers who withdrew messaging consent via STOP/OPTOUT keywords.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-800 text-xs">
          {optOuts.length} Opted Out
        </span>
      </div>

      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <strong>Compliance Policy:</strong> Outbound messages to these numbers are automatically
        blocked by the server. Customers can re-subscribe by replying START or UNSTOP.
      </div>

      {optOuts.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          No opted-out phone numbers recorded. All customer subscriptions are in good standing.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {optOuts.map((item) => (
            <div
              key={item.phoneNumber}
              className="flex items-center justify-between py-2.5 text-xs"
            >
              <div>
                <span className="font-mono font-medium text-slate-900">{item.phoneNumber}</span>
                {item.reason && <span className="ml-2 text-slate-500">({item.reason})</span>}
              </div>
              <span className="text-slate-400">
                {new Date(item.optedOutAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

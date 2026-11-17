import React from 'react';
import { PRICING_DISCLOSURES } from '@palnadu/contracts';

export interface PricingDisclosureProps {
  variant?: 'primary' | 'compact' | 'basket';
  className?: string;
}

export function PricingDisclosure({ variant = 'primary', className = '' }: PricingDisclosureProps) {
  if (variant === 'compact') {
    return (
      <p className={`text-[11px] text-slate-500 italic ${className}`}>
        {PRICING_DISCLOSURES.COMPACT}
      </p>
    );
  }

  if (variant === 'basket') {
    return (
      <div
        className={`rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-slate-700 ${className}`}
      >
        <div className="font-bold uppercase tracking-wider text-blue-900 mb-1">
          Indicative Quotation Estimate Notice
        </div>
        <p className="text-slate-600 leading-relaxed">{PRICING_DISCLOSURES.BASKET}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 ${className}`}
    >
      <div className="font-bold uppercase tracking-wider text-slate-700 mb-1">
        Pricing Transparency Disclosure
      </div>
      <p className="leading-relaxed text-slate-600">{PRICING_DISCLOSURES.PRIMARY}</p>
    </div>
  );
}

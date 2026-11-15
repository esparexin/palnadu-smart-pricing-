'use client';

import React from 'react';
import type { PricingDiscountType } from '@palnadu/contracts';

export interface PricingState {
  mrpRupees: string;
  offerPriceRupees: string;
  discountType: PricingDiscountType;
  discountValueInput: string;
}

export interface PricingFieldsProps {
  value: PricingState;
  onChange: (updated: PricingState) => void;
  disabled?: boolean;
}

export function PricingFields({ value, onChange, disabled }: PricingFieldsProps) {
  const mrp = parseFloat(value.mrpRupees) || 0;
  const offer = parseFloat(value.offerPriceRupees) || 0;
  const discountVal = parseFloat(value.discountValueInput) || 0;

  let calculatedDiscountPaise = 0;
  const offerPaise = Math.round(offer * 100);

  if (value.discountType === 'fixed') {
    calculatedDiscountPaise = Math.round(discountVal * 100);
  } else if (value.discountType === 'percentage') {
    const basisPoints = Math.round(discountVal * 100);
    calculatedDiscountPaise = Math.round((offerPaise * basisPoints) / 10000);
  }

  calculatedDiscountPaise = Math.min(calculatedDiscountPaise, offerPaise);
  const netPricePaise = Math.max(0, offerPaise - calculatedDiscountPaise);
  const netPriceRupees = (netPricePaise / 100).toFixed(2);
  const savingsRupees = mrp > 0 ? Math.max(0, mrp - netPricePaise / 100).toFixed(2) : '0.00';

  const isOfferExceedingMrp = mrp > 0 && offer > mrp;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 className="font-semibold text-sm text-slate-800">Product Pricing &amp; Discounts</h3>
        <span className="text-xs text-slate-500 font-mono">Integer-Paise Protected</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price-mrp" className="block font-medium text-slate-700 text-xs">
            MRP (₹ Maximum Retail Price)
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
              ₹
            </span>
            <input
              id="price-mrp"
              type="number"
              min="0"
              step="0.01"
              disabled={disabled}
              value={value.mrpRupees}
              onChange={(e) => onChange({ ...value, mrpRupees: e.target.value })}
              placeholder="0.00"
              className="touch-target w-full rounded-md border border-slate-300 pl-7 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="price-offer" className="block font-medium text-slate-700 text-xs">
            Offer Price (₹ Base Selling Price) *
          </label>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
              ₹
            </span>
            <input
              id="price-offer"
              type="number"
              min="0"
              step="0.01"
              required
              disabled={disabled}
              value={value.offerPriceRupees}
              onChange={(e) => onChange({ ...value, offerPriceRupees: e.target.value })}
              placeholder="0.00"
              className={`touch-target w-full rounded-md border pl-7 pr-3 py-2 text-sm focus:outline-none ${
                isOfferExceedingMrp
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-300 focus:border-emerald-500'
              }`}
            />
          </div>
          {isOfferExceedingMrp && (
            <p className="mt-1 text-xs text-red-600">Offer price cannot exceed MRP.</p>
          )}
        </div>

        <div>
          <label htmlFor="discount-type" className="block font-medium text-slate-700 text-xs">
            Discount Method
          </label>
          <select
            id="discount-type"
            disabled={disabled}
            value={value.discountType}
            onChange={(e) =>
              onChange({
                ...value,
                discountType: e.target.value as PricingDiscountType,
                discountValueInput: e.target.value === 'none' ? '0' : value.discountValueInput,
              })
            }
            className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          >
            <option value="none">No Discount</option>
            <option value="fixed">Fixed Amount (₹ per unit)</option>
            <option value="percentage">Percentage (% off offer price)</option>
          </select>
        </div>

        {value.discountType !== 'none' && (
          <div>
            <label htmlFor="discount-val" className="block font-medium text-slate-700 text-xs">
              {value.discountType === 'percentage'
                ? 'Discount Percentage (%)'
                : 'Discount Amount (₹)'}
            </label>
            <input
              id="discount-val"
              type="number"
              min="0"
              max={value.discountType === 'percentage' ? '100' : undefined}
              step={value.discountType === 'percentage' ? '0.1' : '0.01'}
              disabled={disabled}
              value={value.discountValueInput}
              onChange={(e) => onChange({ ...value, discountValueInput: e.target.value })}
              placeholder={value.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 200'}
              className="touch-target mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="rounded-md border border-emerald-100 bg-emerald-50/60 p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div>
          <span className="text-emerald-800 font-medium">Effective Unit Price:</span>{' '}
          <span className="text-emerald-950 font-bold text-sm font-mono">₹{netPriceRupees}</span>
        </div>
        <div>
          <span className="text-emerald-800 font-medium">Customer Savings vs MRP:</span>{' '}
          <span className="text-emerald-900 font-semibold font-mono">₹{savingsRupees}</span>
        </div>
      </div>
    </div>
  );
}

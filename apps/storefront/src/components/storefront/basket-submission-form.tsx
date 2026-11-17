'use client';

import React, { useState } from 'react';
import type { BasketItem } from '../../context/basket-context';

export interface BasketSubmissionFormProps {
  items: BasketItem[];
  onSubmit: (data: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerNotes?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function BasketSubmissionForm({
  items,
  onSubmit,
  isSubmitting,
  error,
}: BasketSubmissionFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const name = customerName.trim();
    const email = customerEmail.trim();
    const phone = customerPhone.trim();
    const notes = customerNotes.trim();

    if (!name) {
      setValidationError('Please provide your name or business name.');
      return;
    }

    if (!termsAccepted) {
      setValidationError(
        'Please accept the business Terms and Conditions to submit your quotation request.',
      );
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please provide a valid email address.');
      return;
    }

    if (phone && phone.replace(/\D/g, '').length < 10) {
      setValidationError('Phone number must have at least 10 digits.');
      return;
    }

    const consentPrefix = `[Consent: Terms Accepted${marketingOptIn ? '; Marketing Opt-in' : ''}]`;
    const fullNotes = notes ? `${consentPrefix}\n${notes}` : consentPrefix;

    await onSubmit({
      customerName: name,
      customerEmail: email || undefined,
      customerPhone: phone || undefined,
      customerNotes: fullNotes,
    });
  };

  return (
    <form
      id="quote-submission-form"
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
    >
      <h2 className="text-base font-bold text-slate-900">Contact Details for Quote Delivery</h2>
      <p className="text-xs text-slate-500">
        Our commercial engineering team will calculate your volume discounts and deliver the
        itemized official quote.
      </p>

      {(validationError || error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {validationError || error}
        </div>
      )}

      <div>
        <label htmlFor="customerName" className="block text-xs font-semibold text-slate-700">
          Full Name / Organization <span className="text-red-500">*</span>
        </label>
        <input
          id="customerName"
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g. Acme Industries Ltd / S. Sharma"
          required
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customerEmail" className="block text-xs font-semibold text-slate-700">
            Email Address
          </label>
          <input
            id="customerEmail"
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="procurement@company.com"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="customerPhone" className="block text-xs font-semibold text-slate-700">
            Phone / Mobile Number
          </label>
          <input
            id="customerPhone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 italic">
        * Phone and email are optional. If provided, official estimates and volume discounts are
        delivered directly.
      </p>

      <div>
        <label htmlFor="customerNotes" className="block text-xs font-semibold text-slate-700">
          Project Notes / Delivery Location / Special Requirements (Optional)
        </label>
        <textarea
          id="customerNotes"
          rows={3}
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          placeholder="State delivery destination, required certifications, GSTIN or procurement schedule..."
          maxLength={1000}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Terms Acceptance & Optional Marketing Opt-In */}
      <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            id="terms-acceptance"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-slate-700 leading-snug">
            I accept the business{' '}
            <strong className="font-semibold text-slate-900">Terms and Conditions</strong> for this
            quotation request. All displayed prices are indicative estimates subject to final
            commercial confirmation. <span className="text-red-500">*</span>
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            id="marketing-optin"
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-slate-600 leading-snug">
            I opt in to receive commercial updates, product announcements, and promotional
            communications. (Optional)
          </span>
        </label>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <button
          type="submit"
          disabled={isSubmitting || items.length === 0}
          className="hidden md:inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isSubmitting ? 'Submitting Quotation Request...' : 'Submit Quotation Request'}
        </button>
      </div>
    </form>
  );
}

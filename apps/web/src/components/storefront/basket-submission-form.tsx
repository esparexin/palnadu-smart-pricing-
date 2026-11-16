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

    if (!email && !phone) {
      setValidationError(
        'Please provide at least an email address or phone number for quote delivery.',
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

    await onSubmit({
      customerName: name,
      customerEmail: email || undefined,
      customerPhone: phone || undefined,
      customerNotes: notes || undefined,
    });
  };

  const itemLines = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.productName}${item.variantModel ? ` (${item.variantModel})` : item.model ? ` (${item.model})` : ''} - Qty: ${item.quantity} ${item.unit}`,
    )
    .join('\n');

  const whatsappText = encodeURIComponent(
    `Hello, I would like to request an official quotation for the following items:\n\n${itemLines}\n\n*Customer:* ${customerName.trim() || 'Commercial Buyer'}\n${customerPhone.trim() ? `*Phone:* ${customerPhone.trim()}\n` : ''}${customerEmail.trim() ? `*Email:* ${customerEmail.trim()}\n` : ''}${customerNotes.trim() ? `*Notes:* ${customerNotes.trim()}\n` : ''}\nPlease provide authoritative pricing and delivery timelines.`,
  );
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

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
        * Provide either email or phone (or both) to receive your official quotation.
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

      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Send via WhatsApp
        </a>
        <button
          type="submit"
          disabled={isSubmitting || items.length === 0}
          className="hidden md:inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isSubmitting ? 'Submitting Quotation Request...' : 'Submit Quotation Request'}
        </button>
      </div>
    </form>
  );
}

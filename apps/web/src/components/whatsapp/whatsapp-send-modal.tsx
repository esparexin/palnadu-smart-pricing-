'use client';

import React, { useState } from 'react';
import type { SendWhatsAppMessageRequest, WhatsAppOptOutListItem } from '@palnadu/contracts';

export interface WhatsAppSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: SendWhatsAppMessageRequest) => Promise<void>;
  optOuts: WhatsAppOptOutListItem[];
}

export function WhatsAppSendModal({ isOpen, onClose, onSubmit, optOuts }: WhatsAppSendModalProps) {
  const [to, setTo] = useState('');
  const [type, setType] = useState<'text' | 'template'>('text');
  const [text, setText] = useState('');
  const [templateName, setTemplateName] = useState('quotation_ready');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOptedOut = optOuts.some((o) => o.phoneNumber.trim() === to.trim().replace(/\s+/g, ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTo = to.trim().replace(/\s+/g, '');
    if (!cleanTo || cleanTo.length < 8) {
      setError('Please provide a valid E.164 phone number (e.g. +919876543210).');
      return;
    }

    if (isOptedOut) {
      setError('Cannot send message: Recipient has opted out of WhatsApp messages.');
      return;
    }

    if (type === 'text' && !text.trim()) {
      setError('Please enter message text.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        to: cleanTo,
        type,
        text: type === 'text' ? text.trim() : undefined,
        templateName: type === 'template' ? templateName.trim() : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send WhatsApp message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 id="send-modal-title" className="font-semibold text-lg text-slate-900">
            Send WhatsApp Notification
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label="Close dialog"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="whatsappTo" className="block font-medium text-xs text-slate-700">
              Recipient Phone Number (with Country Code)
            </label>
            <input
              type="text"
              id="whatsappTo"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. +919876543210"
              disabled={isSubmitting}
              required
              className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {isOptedOut && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                Warning: This phone number has opted out of WhatsApp messages.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="messageType" className="block font-medium text-xs text-slate-700">
              Message Format
            </label>
            <select
              id="messageType"
              value={type}
              onChange={(e) => setType(e.target.value as 'text' | 'template')}
              disabled={isSubmitting}
              className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="text">Session Text (Active 24-hr Window)</option>
              <option value="template">Meta Approved Template (Out-of-Window)</option>
            </select>
          </div>

          {type === 'template' ? (
            <div>
              <label htmlFor="templateName" className="block font-medium text-xs text-slate-700">
                Template Name
              </label>
              <input
                type="text"
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="quotation_ready"
                disabled={isSubmitting}
                className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="messageText" className="block font-medium text-xs text-slate-700">
                Message Content
              </label>
              <textarea
                id="messageText"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type customer message..."
                disabled={isSubmitting}
                className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="touch-target rounded-md border border-slate-300 px-4 py-2 font-medium text-xs text-slate-700 hover:bg-slate-50 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOptedOut}
              className="touch-target rounded-md bg-emerald-600 px-4 py-2 font-medium text-xs text-white hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

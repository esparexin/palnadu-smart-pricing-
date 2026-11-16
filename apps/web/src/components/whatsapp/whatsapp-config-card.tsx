'use client';

import React, { useState } from 'react';
import type { UpdateWhatsAppConfigRequest, WhatsAppConfig } from '@palnadu/contracts';
import { WhatsAppConfigInputs } from './whatsapp-config-inputs';

export interface WhatsAppConfigCardProps {
  config: WhatsAppConfig;
  onUpdate: (updates: UpdateWhatsAppConfigRequest) => Promise<void>;
  disabled?: boolean;
}

export function WhatsAppConfigCard({ config, onUpdate, disabled }: WhatsAppConfigCardProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [phoneNumberId, setPhoneNumberId] = useState(config.phoneNumberId);
  const [wabaId, setWabaId] = useState(config.wabaId);
  const [verifiedNumber, setVerifiedNumber] = useState(config.verifiedNumber || '');
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState(config.verifyToken);
  const [humanHandover, setHumanHandover] = useState(config.humanHandoverEnabled);

  const [isSaving, setIsSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(config.webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const payload: UpdateWhatsAppConfigRequest = {
        enabled,
        phoneNumberId: phoneNumberId.trim(),
        wabaId: wabaId.trim(),
        verifiedNumber: verifiedNumber.trim() || undefined,
        verifyToken: verifyToken.trim(),
        humanHandoverEnabled: humanHandover,
      };
      if (accessToken.trim()) payload.accessToken = accessToken.trim();
      if (appSecret.trim()) payload.appSecret = appSecret.trim();

      await onUpdate(payload);
      setAccessToken('');
      setAppSecret('');
      setMessage('Configuration saved successfully.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-base text-slate-900">WhatsApp Cloud API Assets</h2>
          <p className="text-xs text-slate-500">
            Dedicated client credentials and Meta Webhook verification parameters.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${
            config.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {config.enabled ? 'Integration Active' : 'Integration Disabled'}
        </span>
      </div>

      <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-semibold text-slate-700">Webhook Callback URL:</span>{' '}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-800">
              {config.webhookUrl}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyWebhook}
            className="touch-target inline-flex items-center justify-center rounded border border-slate-300 bg-white px-2.5 py-1 font-medium text-xs text-slate-700 hover:bg-slate-50"
          >
            {copiedUrl ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 font-medium text-sm text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={disabled || isSaving}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Enable WhatsApp Cloud API Integration
          </label>

          <label className="flex items-center gap-2 font-medium text-sm text-slate-700">
            <input
              type="checkbox"
              checked={humanHandover}
              onChange={(e) => setHumanHandover(e.target.checked)}
              disabled={disabled || isSaving}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Human Handover for Complex Enquiries
          </label>
        </div>

        <WhatsAppConfigInputs
          config={config}
          phoneNumberId={phoneNumberId}
          setPhoneNumberId={setPhoneNumberId}
          wabaId={wabaId}
          setWabaId={setWabaId}
          verifiedNumber={verifiedNumber}
          setVerifiedNumber={setVerifiedNumber}
          verifyToken={verifyToken}
          setVerifyToken={setVerifyToken}
          accessToken={accessToken}
          setAccessToken={setAccessToken}
          appSecret={appSecret}
          setAppSecret={setAppSecret}
          disabled={disabled || isSaving}
        />

        {message && (
          <p
            className={`text-xs font-medium ${message.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}
          >
            {message}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled || isSaving}
            className="touch-target inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 font-medium text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

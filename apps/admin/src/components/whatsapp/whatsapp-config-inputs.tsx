'use client';

import React from 'react';
import type { WhatsAppConfig } from '@palnadu/contracts';

export interface WhatsAppConfigInputsProps {
  config: WhatsAppConfig;
  phoneNumberId: string;
  setPhoneNumberId: (val: string) => void;
  wabaId: string;
  setWabaId: (val: string) => void;
  verifiedNumber: string;
  setVerifiedNumber: (val: string) => void;
  verifyToken: string;
  setVerifyToken: (val: string) => void;
  accessToken: string;
  setAccessToken: (val: string) => void;
  appSecret: string;
  setAppSecret: (val: string) => void;
  disabled?: boolean;
}

export function WhatsAppConfigInputs({
  config,
  phoneNumberId,
  setPhoneNumberId,
  wabaId,
  setWabaId,
  verifiedNumber,
  setVerifiedNumber,
  verifyToken,
  setVerifyToken,
  accessToken,
  setAccessToken,
  appSecret,
  setAppSecret,
  disabled,
}: WhatsAppConfigInputsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="block font-medium text-xs text-slate-700">Phone Number ID</label>
        <input
          type="text"
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="e.g. 109283746501928"
          disabled={disabled}
          className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block font-medium text-xs text-slate-700">WABA ID (Account ID)</label>
        <input
          type="text"
          value={wabaId}
          onChange={(e) => setWabaId(e.target.value)}
          placeholder="e.g. 987654321098765"
          disabled={disabled}
          className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block font-medium text-xs text-slate-700">Verified WhatsApp Number</label>
        <input
          type="text"
          value={verifiedNumber}
          onChange={(e) => setVerifiedNumber(e.target.value)}
          placeholder="e.g. +91 98765 43210"
          disabled={disabled}
          className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block font-medium text-xs text-slate-700">Webhook Verify Token</label>
        <input
          type="text"
          value={verifyToken}
          onChange={(e) => setVerifyToken(e.target.value)}
          disabled={disabled}
          className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block font-medium text-xs text-slate-700">
          Access Token {config.hasAccessToken ? '(Stored Encrypted)' : '(Not Set)'}
        </label>
        <input
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder={
            config.hasAccessToken
              ? '•••••••••••••••• (Leave blank to keep current)'
              : 'Enter EAABw... token'
          }
          disabled={disabled}
          className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block font-medium text-xs text-slate-700">
          App Secret {config.hasAppSecret ? '(Stored Encrypted)' : '(Not Set)'}
        </label>
        <input
          type="password"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
          placeholder={
            config.hasAppSecret
              ? '•••••••••••••••• (Leave blank to keep current)'
              : 'Enter App Secret'
          }
          disabled={disabled}
          className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import type { ErpProviderType } from '@palnadu/contracts';

export interface ConnectorBasicInputsProps {
  name: string;
  provider: ErpProviderType;
  enabled: boolean;
  endpointUrl: string;
  authSecret: string;
  isEditing: boolean;
  onNameChange: (val: string) => void;
  onProviderChange: (val: ErpProviderType) => void;
  onEnabledChange: (val: boolean) => void;
  onEndpointUrlChange: (val: string) => void;
  onAuthSecretChange: (val: string) => void;
}

export function ConnectorBasicInputs({
  name,
  provider,
  enabled,
  endpointUrl,
  authSecret,
  isEditing,
  onNameChange,
  onProviderChange,
  onEnabledChange,
  onEndpointUrlChange,
  onAuthSecretChange,
}: ConnectorBasicInputsProps) {
  return (
    <>
      <div>
        <label htmlFor="conn-name" className="block font-medium text-slate-700 text-xs">
          Connector Name
        </label>
        <input
          id="conn-name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Tally Head Office"
          className="mt-1 block min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="conn-provider" className="block font-medium text-slate-700 text-xs">
            Provider Type
          </label>
          <select
            id="conn-provider"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as ErpProviderType)}
            className="mt-1 block min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="tally_prime">TallyPrime</option>
            <option value="generic_webhook">Generic Webhook</option>
            <option value="custom_erp">Custom ERP</option>
          </select>
        </div>

        <div className="flex items-center pt-5">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-slate-700 text-xs">Enable Synchronization</span>
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="conn-endpoint" className="block font-medium text-slate-700 text-xs">
          Endpoint URL (Optional)
        </label>
        <input
          id="conn-endpoint"
          type="url"
          value={endpointUrl}
          onChange={(e) => onEndpointUrlChange(e.target.value)}
          placeholder="http://localhost:9000 or https://erp.palnadu.in/sync"
          className="mt-1 block min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="conn-secret" className="block font-medium text-slate-700 text-xs">
          Auth Secret / API Key (Optional)
        </label>
        <input
          id="conn-secret"
          type="password"
          value={authSecret}
          onChange={(e) => onAuthSecretChange(e.target.value)}
          placeholder={isEditing ? 'Leave blank to preserve existing key' : 'Enter secret key'}
          className="mt-1 block min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </>
  );
}

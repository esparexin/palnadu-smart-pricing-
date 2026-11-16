'use client';

import React from 'react';
import type { ErpConnectorConfig } from '@palnadu/contracts';

export interface ConnectorCardProps {
  connector: ErpConnectorConfig;
  onEdit: (connector: ErpConnectorConfig) => void;
  onSync: (connector: ErpConnectorConfig) => void;
  onDelete: (connector: ErpConnectorConfig) => void;
}

const PROVIDER_NAMES: Record<string, string> = {
  tally_prime: 'TallyPrime XML Gateway',
  generic_webhook: 'Generic ERP Webhook',
  custom_erp: 'Custom On-Premise Connector',
};

export function ConnectorCard({ connector, onEdit, onSync, onDelete }: ConnectorCardProps) {
  const isTally = connector.provider === 'tally_prime';

  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-slate-900">{connector.name}</h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${
                  connector.enabled
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {connector.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {PROVIDER_NAMES[connector.provider] || connector.provider}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded px-2 py-1 font-mono text-xs ${
              connector.lastSyncStatus === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : connector.lastSyncStatus === 'failed'
                  ? 'bg-red-50 text-red-800'
                  : 'bg-slate-50 text-slate-600'
            }`}
          >
            {connector.lastSyncStatus}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-2.5 text-xs">
          <div>
            <span className="block text-slate-400">Product SSOT</span>
            <span className="font-medium text-slate-700">
              {connector.productSsot === 'external_erp' ? 'ERP' : 'Smart Pricing'}
            </span>
          </div>
          <div>
            <span className="block text-slate-400">Inventory SSOT</span>
            <span className="font-medium text-slate-700">
              {connector.inventorySsot === 'external_erp' ? 'ERP' : 'Smart Pricing'}
            </span>
          </div>
          <div>
            <span className="block text-slate-400">Price SSOT</span>
            <span className="font-medium text-slate-700">
              {connector.priceSsot === 'external_erp' ? 'ERP' : 'Smart Pricing'}
            </span>
          </div>
        </div>

        {connector.endpointUrl && (
          <div className="mt-3 truncate text-xs text-slate-500">
            <span className="text-slate-400">Endpoint: </span>
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-800">
              {connector.endpointUrl}
            </code>
          </div>
        )}

        <div className="mt-2 text-xs text-slate-400">
          Last Sync:{' '}
          {connector.lastSyncAt ? new Date(connector.lastSyncAt).toLocaleString() : 'Never'}
        </div>

        {isTally && (
          <div className="mt-3 rounded border border-blue-100 bg-blue-50/50 p-2 text-xs text-blue-700">
            <strong>Security Note:</strong> TallyPrime port 9000 is internal-only. Push stock
            updates via the on-premise webhook endpoint.
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => onSync(connector)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-blue-600 px-3.5 py-2 font-medium text-white text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Sync Now
        </button>
        <button
          type="button"
          onClick={() => onEdit(connector)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-300 bg-white px-3.5 py-2 font-medium text-slate-700 text-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(connector)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-red-200 bg-white px-3.5 py-2 font-medium text-red-600 text-xs hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

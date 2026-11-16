'use client';

import React, { useState } from 'react';
import type { ErpConnectorConfig, TriggerSyncRequest } from '@palnadu/contracts';

export interface SyncModalProps {
  connector: ErpConnectorConfig;
  onClose: () => void;
  onTrigger: (connectorId: string, req: TriggerSyncRequest) => Promise<void>;
}

export function SyncModal({ connector, onClose, onTrigger }: SyncModalProps) {
  const [jobType, setJobType] = useState<'products' | 'inventory' | 'full'>('inventory');
  const [payloadData, setPayloadData] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      await onTrigger(connector.id, {
        jobType,
        payloadData: payloadData.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync execution failed');
    } finally {
      setRunning(false);
    }
  };

  const isTally = connector.provider === 'tally_prime';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-semibold text-lg text-slate-900">Run Synchronization</h2>
            <p className="text-xs text-slate-500">
              {connector.name} ({connector.provider})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-slate-400 hover:text-slate-600"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="sync-job-type" className="block font-medium text-slate-700 text-xs">
              Sync Job Scope
            </label>
            <select
              id="sync-job-type"
              value={jobType}
              onChange={(e) => setJobType(e.target.value as 'products' | 'inventory' | 'full')}
              className="mt-1 block min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="inventory">Inventory Quantities Only</option>
              <option value="products">Product Catalog Only</option>
              <option value="full">Full Sync (Catalog, Inventory, Prices)</option>
            </select>
          </div>

          <div>
            <label htmlFor="sync-payload" className="block font-medium text-slate-700 text-xs">
              {isTally ? 'Tally XML Data (Optional)' : 'JSON Data (Optional)'}
            </label>
            <textarea
              id="sync-payload"
              rows={6}
              value={payloadData}
              onChange={(e) => setPayloadData(e.target.value)}
              placeholder={
                isTally
                  ? '<ENVELOPE>\n  <BODY>\n    <DATA>\n      <TALLYMESSAGE>\n        <STOCKITEM NAME="16mm TMT Bar">...</STOCKITEM>\n      </TALLYMESSAGE>\n    </DATA>\n  </BODY>\n</ENVELOPE>'
                  : '[{ "sku": "TMT-16MM", "quantity": 120, "rateRupees": 65.50 }]'
              }
              className="mt-1 block w-full rounded-md border border-slate-300 p-3 font-mono text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Leave blank to trigger remote pull from endpointUrl, or paste export payload directly.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={running}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {running ? 'Running Sync...' : 'Start Sync'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

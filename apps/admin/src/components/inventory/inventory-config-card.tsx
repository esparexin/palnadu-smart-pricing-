'use client';

import React, { useState } from 'react';
import type { InventoryConfig, UpdateInventoryConfigRequest } from '@palnadu/contracts';

export interface InventoryConfigCardProps {
  config: InventoryConfig;
  onUpdate: (updates: UpdateInventoryConfigRequest) => Promise<void>;
  disabled?: boolean;
}

export function InventoryConfigCard({ config, onUpdate, disabled }: InventoryConfigCardProps) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [threshold, setThreshold] = useState(config.defaultThreshold);
  const [ownership, setOwnership] = useState(config.stockOwnership);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await onUpdate({
        enabled,
        defaultThreshold: Number(threshold),
        stockOwnership: ownership,
      });
      setMessage('Configuration saved successfully.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const isErp = ownership === 'external_erp';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-base text-slate-900">Inventory Configuration</h2>
          <p className="text-xs text-slate-500">
            Control stock tracking, alert thresholds, and master ERP ownership.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${
            isErp ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {isErp ? 'External ERP Ownership' : 'Smart Pricing Managed'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="inventoryEnabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={disabled || isSaving}
            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="inventoryEnabled" className="font-medium text-sm text-slate-700">
            Enable Inventory &amp; Stock Tracking
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="defaultThreshold" className="block font-medium text-xs text-slate-700">
              Default Low Stock Alert Threshold
            </label>
            <input
              type="number"
              id="defaultThreshold"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
              disabled={disabled || isSaving}
              className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Alerts trigger when available stock falls at or below this value.
            </p>
          </div>

          <div>
            <label htmlFor="stockOwnership" className="block font-medium text-xs text-slate-700">
              Authoritative Stock Source
            </label>
            <select
              id="stockOwnership"
              value={ownership}
              onChange={(e) => setOwnership(e.target.value as 'smart_pricing' | 'external_erp')}
              disabled={disabled || isSaving}
              className="touch-target mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="smart_pricing">Palnadu Smart Pricing (Standalone)</option>
              <option value="external_erp">External ERP (Tally / SAP - Read Only)</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              {isErp
                ? 'Manual stock movement recording is locked.'
                : 'Stock can be adjusted manually or via imports.'}
            </p>
          </div>
        </div>

        {isErp && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <strong>Notice:</strong> When stock is owned by an external ERP, Smart Pricing does not
            permit manual inventory adjustments.
          </div>
        )}

        {message && (
          <p
            className={`text-xs font-medium ${
              message.includes('success') ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={disabled || isSaving}
            className="touch-target inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 font-medium text-sm text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

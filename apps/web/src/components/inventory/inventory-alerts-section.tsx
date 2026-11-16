'use client';

import React, { useState } from 'react';
import type { InventoryAlertResponse } from '@palnadu/contracts';

export interface InventoryAlertsSectionProps {
  alerts: InventoryAlertResponse[];
  onAcknowledge: (alertId: string) => Promise<void>;
  disabled?: boolean;
}

export function InventoryAlertsSection({
  alerts,
  onAcknowledge,
  disabled,
}: InventoryAlertsSectionProps) {
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const activeAlerts = alerts.filter((a) => a.state === 'active');

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      await onAcknowledge(alertId);
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base text-slate-900">Low Stock Alerts</h2>
          {activeAlerts.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-800 text-xs">
              {activeAlerts.length} Active
            </span>
          )}
        </div>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          No active stock alerts. All inventory items meet or exceed their reorder thresholds.
        </div>
      ) : (
        <div className="mt-4 divide-y divide-slate-100">
          {activeAlerts.map((alert) => {
            const isOutOfStock = alert.alertClass === 'out_of_stock';
            const isProcessing = acknowledgingId === alert.id;

            return (
              <div
                key={alert.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 font-medium text-xs ${
                        isOutOfStock ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                    </span>
                    <span className="font-medium text-sm text-slate-900">{alert.productName}</span>
                    {alert.sku && (
                      <span className="font-mono text-xs text-slate-500">({alert.sku})</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Stock fell to{' '}
                    <strong className="text-slate-700">{alert.availableSnapshot}</strong> units
                    (Threshold: {alert.thresholdSnapshot}) &bull;{' '}
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={() => handleAcknowledge(alert.id)}
                  className="touch-target inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-xs text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {isProcessing ? 'Acknowledging...' : 'Acknowledge'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import type { ImportBatchResponse } from '@palnadu/contracts';

interface ImportHistorySectionProps {
  batches: ImportBatchResponse[];
  onDownloadErrors: (batchId: string) => void;
  onExportProducts: (options: {
    status?: 'draft' | 'published' | 'archived';
    includePricing: boolean;
  }) => void;
  exporting: boolean;
}

export function ImportHistorySection({
  batches,
  onDownloadErrors,
  onExportProducts,
  exporting,
}: ImportHistorySectionProps) {
  const [exportStatus, setExportStatus] = useState<'draft' | 'published' | 'archived' | ''>('');
  const [includePricing, setIncludePricing] = useState(false);

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    onExportProducts({
      status: exportStatus ? exportStatus : undefined,
      includePricing,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">Import History & Audit Trail</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-neutral-500">No import batches found yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Date</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">File</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Mode</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Status</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Total / Applied</th>
                  <th className="px-3 py-2 font-semibold text-neutral-700">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2 text-neutral-600 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-medium text-neutral-900 max-w-[120px] truncate">
                      {b.fileName ?? 'Manual CSV'}
                    </td>
                    <td className="px-3 py-2 text-neutral-600 font-mono text-[11px]">{b.mode}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          b.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : b.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-800">
                      {b.totalRows} / {b.appliedRows}
                    </td>
                    <td className="px-3 py-2">
                      {b.invalidRows > 0 ? (
                        <button
                          type="button"
                          onClick={() => onDownloadErrors(b.id)}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center text-xs font-medium text-amber-700 hover:text-amber-900 underline"
                        >
                          Export ({b.invalidRows})
                        </button>
                      ) : (
                        <span className="text-neutral-400">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-neutral-900">Export Catalogue</h2>
        <p className="text-xs text-neutral-600">
          Export products to a CSV file. Private pricing fields are omitted unless explicitly
          selected.
        </p>
        <form onSubmit={handleExport} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Status Filter
            </label>
            <select
              value={exportStatus}
              onChange={(e) =>
                setExportStatus(e.target.value as 'draft' | 'published' | 'archived' | '')
              }
              className="w-full rounded-md border border-neutral-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft Only</option>
              <option value="published">Published Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includePricing"
              checked={includePricing}
              onChange={(e) => setIncludePricing(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="includePricing" className="text-xs font-medium text-neutral-700">
              Include pricing columns (MRP, Offer Price)
            </label>
          </div>

          <button
            type="submit"
            disabled={exporting}
            className="w-full inline-flex min-h-[44px] items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 disabled:opacity-50"
          >
            {exporting ? 'Generating CSV...' : 'Download Products (CSV)'}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import type { ImportPreviewResponse } from '@palnadu/contracts';

interface ImportPreviewSectionProps {
  preview: ImportPreviewResponse;
  committing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDownloadErrors: () => void;
}

export function ImportPreviewSection({
  preview,
  committing,
  onConfirm,
  onCancel,
  onDownloadErrors,
}: ImportPreviewSectionProps) {
  const hasErrors = preview.invalidRows > 0;

  return (
    <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Import Preview</h2>
          <p className="text-sm text-neutral-600">
            Mode: <span className="font-semibold">{preview.mode}</span> | Total: {preview.totalRows}{' '}
            rows
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hasErrors && (
            <button
              type="button"
              onClick={onDownloadErrors}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              Download Correction CSV
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={committing}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={committing || preview.validRows === 0}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {committing ? 'Applying Changes...' : `Commit ${preview.validRows} Valid Products`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200">
          <p className="text-xs font-medium uppercase text-neutral-500">Total Rows</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">{preview.totalRows}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-4 border border-green-200">
          <p className="text-xs font-medium uppercase text-green-700">Valid Rows</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{preview.validRows}</p>
        </div>
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-xs font-medium uppercase text-red-700">Invalid Rows</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{preview.invalidRows}</p>
        </div>
      </div>

      {hasErrors && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900">
            Validation Errors ({preview.errors.length})
          </h3>
          <p className="mt-1 text-xs text-red-700">
            Fix these in your spreadsheet or download the correction CSV.
          </p>
          <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
            {preview.errors.slice(0, 50).map((err, idx) => (
              <div key={idx} className="text-xs text-red-800">
                <span className="font-bold">Row {err.rowNumber}</span>
                {err.field && <span> [{err.field}]</span>}: {err.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Preview (First 10 Rows)</h3>
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-neutral-700">Row</th>
                <th className="px-3 py-2 font-semibold text-neutral-700">Status</th>
                <th className="px-3 py-2 font-semibold text-neutral-700">SKU</th>
                <th className="px-3 py-2 font-semibold text-neutral-700">Name</th>
                <th className="px-3 py-2 font-semibold text-neutral-700">MRP (Paise)</th>
                <th className="px-3 py-2 font-semibold text-neutral-700">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {preview.previewRows.map((row, idx) => {
                const data = (row.data ?? {}) as Record<string, unknown>;
                const isInvalid = row.status === 'invalid';
                return (
                  <tr key={idx} className={isInvalid ? 'bg-red-50/50' : ''}>
                    <td className="px-3 py-2 font-medium text-neutral-900">
                      {String(row.rowNumber ?? '')}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isInvalid ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {String(row.status ?? '')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-neutral-800 font-mono">
                      {String(data.sku ?? '-')}
                    </td>
                    <td className="px-3 py-2 text-neutral-800">{String(data.name ?? '-')}</td>
                    <td className="px-3 py-2 text-neutral-600">{String(data.mrpPaise ?? '-')}</td>
                    <td className="px-3 py-2 text-neutral-600">
                      {String(data.sellingPricePaise ?? '-')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

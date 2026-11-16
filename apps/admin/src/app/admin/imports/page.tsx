'use client';

import React, { useEffect, useState } from 'react';
import type { ImportBatchResponse, ImportMode, ImportPreviewResponse } from '@palnadu/contracts';
import { ApiClient } from '../../../lib/api-client';
import { ImportExportClient } from '../../../lib/import-export-client';
import { ImportPreviewSection } from '../../../components/imports/import-preview-section';
import { ImportHistorySection } from '../../../components/imports/import-history-section';

export default function AdminImportsPage() {
  const [client] = useState(() => new ImportExportClient(new ApiClient()));
  const [mode, setMode] = useState<ImportMode>('create_only');
  const [fileName, setFileName] = useState<string>('');
  const [csvContent, setCsvContent] = useState<string>('');
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [batches, setBatches] = useState<ImportBatchResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBatches = async () => {
    try {
      const data = await client.listBatches({ limit: 20 });
      setBatches(data);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent((event.target?.result as string) ?? '');
    };
    reader.readAsText(file);
  };

  const handlePreview = async () => {
    if (!csvContent) {
      setError('Please select a valid CSV file first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await client.previewImport({
        mode,
        csvContent,
        fileName: fileName || 'import.csv',
      });
      setPreview(res);
      fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await client.confirmImport(preview.batchId);
      setSuccess(
        `Import committed successfully! Applied: ${res.appliedRows}, Skipped: ${res.skippedRows}. Note: Stock balances remain untouched.`,
      );
      setPreview(null);
      setCsvContent('');
      setFileName('');
      fetchBatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setCommitting(false);
    }
  };

  const handleExportProducts = async (options: {
    status?: 'draft' | 'published' | 'archived';
    includePricing: boolean;
  }) => {
    setExporting(true);
    try {
      const csv = await client.exportProducts(options);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Bulk Product Import & Export</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Manage catalogue at scale. Product imports never alter inventory stock.
          </p>
        </div>
        <a
          href={client.getTemplateUrl()}
          download="product-import-template-v1.csv"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Download Template (CSV)
        </a>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {success}
        </div>
      )}

      {!preview ? (
        <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900">Upload Catalogue File</h2>
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-semibold uppercase text-neutral-700 mb-2">
                Import Mode
              </span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex items-center gap-2 cursor-pointer border rounded-md p-3 hover:bg-neutral-50 flex-1">
                  <input
                    type="radio"
                    name="mode"
                    value="create_only"
                    checked={mode === 'create_only'}
                    onChange={() => setMode('create_only')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Create Only</p>
                    <p className="text-xs text-neutral-500">Errors if any SKU already exists</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer border rounded-md p-3 hover:bg-neutral-50 flex-1">
                  <input
                    type="radio"
                    name="mode"
                    value="update_existing"
                    checked={mode === 'update_existing'}
                    onChange={() => setMode('update_existing')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Update Existing</p>
                    <p className="text-xs text-neutral-500">Updates existing product and prices</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-neutral-700 mb-2">
                Select CSV Spreadsheet
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer min-h-[44px]"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handlePreview}
                disabled={loading || !csvContent}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Validating CSV...' : 'Validate & Preview Import'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ImportPreviewSection
          preview={preview}
          committing={committing}
          onConfirm={handleConfirm}
          onCancel={() => setPreview(null)}
          onDownloadErrors={() => {
            window.location.href = client.getErrorsExportUrl(preview.batchId);
          }}
        />
      )}

      <ImportHistorySection
        batches={batches}
        onDownloadErrors={(bId) => {
          window.location.href = client.getErrorsExportUrl(bId);
        }}
        onExportProducts={handleExportProducts}
        exporting={exporting}
      />
    </div>
  );
}

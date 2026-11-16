'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminQuotationDetail, QuotationStatus } from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';

const STATUS_FILTERS: { label: string; value: QuotationStatus | 'all' }[] = [
  { label: 'All Requests', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Draft', value: 'draft' },
  { label: 'Issued', value: 'issued' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Rejected', value: 'rejected' },
];

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function getStatusBadge(status: QuotationStatus) {
  switch (status) {
    case 'submitted':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'draft':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'issued':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'delivered':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<AdminQuotationDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<QuotationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuotations = () => {
    setLoading(true);
    setError(null);

    const query: { status?: QuotationStatus; q?: string; limit: number; offset: number } = {
      limit: 50,
      offset: 0,
    };
    if (selectedStatus !== 'all') {
      query.status = selectedStatus;
    }
    if (searchQuery.trim()) {
      query.q = searchQuery.trim();
    }

    apiClient.quotations
      .listQuotations(query)
      .then((res) => {
        setQuotations(res.items);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load quotation requests');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQuotations();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotations();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotation Requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review incoming customer enquiries, calculate volume discounts, and issue official
            documents.
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setSelectedStatus(filter.value)}
              className={`touch-target rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedStatus === filter.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 min-w-[280px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference or customer..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
          <button
            type="submit"
            className="touch-target inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState label="Loading quotation requests..." />
      ) : error ? (
        <ErrorState title="Error Loading Requests" message={error} retry={fetchQuotations} />
      ) : quotations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">No quotation requests found</p>
          <p className="mt-1 text-sm text-slate-500">
            {selectedStatus !== 'all' || searchQuery
              ? 'Try adjusting your filters or search terms.'
              : 'Incoming requests submitted via the storefront will appear here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-900">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Contact
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Items
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Grand Total
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">
                      <Link href={`/admin/quotations/${q.id}`} className="hover:underline">
                        {q.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{q.customerName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {q.customerPhone || q.customerEmail || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(q.status)}`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{q.items.length} items</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(q.grandTotalPaise)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/quotations/${q.id}`}
                        className="touch-target inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Showing {quotations.length} of {total} quotation requests
          </div>
        </div>
      )}
    </div>
  );
}

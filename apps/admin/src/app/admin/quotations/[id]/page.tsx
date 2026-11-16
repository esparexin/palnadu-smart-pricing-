'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { AdminQuotationDetail, CompanyProfile, QuotationStatus } from '@palnadu/contracts';
import { apiClient } from '../../../../lib/api-client';
import { LoadingState } from '../../../../components/loading-state';
import { ErrorState } from '../../../../components/error-state';
import { QuotationDocument } from '../../../../components/admin/quotation-document';
import { QuotationStatusBar } from '../../../../components/admin/quotation-status-bar';
import { QuotationItemsTable } from '../../../../components/admin/quotation-items-table';
import { QuotationOverviewCard } from '../../../../components/admin/quotation-overview-card';

export default function AdminQuotationDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [quotation, setQuotation] = useState<AdminQuotationDetail | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'document'>('review');

  const fetchData = () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      apiClient.quotations.getQuotationById(id),
      apiClient.settings.getCompanyProfile().catch(() => null),
    ])
      .then(([q, cp]) => {
        setQuotation(q);
        setCompanyProfile(cp);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load quotation');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleStatusChange = async (newStatus: QuotationStatus) => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await apiClient.quotations.updateQuotationStatus(id, newStatus);
      setQuotation(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update quotation status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryDelivery = async () => {
    if (!id || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await apiClient.quotations.retryDelivery(id);
      setQuotation(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry WhatsApp delivery');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState label="Loading quotation details..." />;
  if (error || !quotation) {
    return (
      <ErrorState
        title="Error Loading Quotation"
        message={error || 'Quotation not found'}
        retry={fetchData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin/quotations" className="hover:text-blue-600 focus:underline">
              Quotations
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 font-mono">
              {quotation.referenceNumber}
            </span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quotation {quotation.referenceNumber}
          </h1>
        </div>

        {/* View Tabs */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`touch-target rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'review'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Commercial Review
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`touch-target rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === 'document'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Printable Document
          </button>
        </div>
      </div>

      {activeTab === 'document' ? (
        <QuotationDocument quotation={quotation} companyProfile={companyProfile} />
      ) : (
        <div className="space-y-6">
          <QuotationStatusBar
            quotation={quotation}
            actionLoading={actionLoading}
            onStatusChange={handleStatusChange}
            onRetryDelivery={handleRetryDelivery}
          />
          <QuotationOverviewCard quotation={quotation} />
          <QuotationItemsTable items={quotation.items} />
        </div>
      )}
    </div>
  );
}

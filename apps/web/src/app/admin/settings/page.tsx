'use client';

import React, { useEffect, useState } from 'react';
import type { CompanyProfile, UpdateCompanyProfile } from '@palnadu/contracts';
import { apiClient } from '../../../lib/api-client';
import { LoadingState } from '../../../components/loading-state';
import { ErrorState } from '../../../components/error-state';
import { CompanyIdentityFields } from '../../../components/admin/company-identity-fields';

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [gstin, setGstin] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [quotationTerms, setQuotationTerms] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  const fetchProfile = () => {
    setLoading(true);
    setError(null);

    apiClient.settings
      .getCompanyProfile()
      .then((data) => {
        setProfile(data);
        setCompanyName(data.companyName || '');
        setTradingName(data.tradingName || '');
        setRegisteredAddress(data.registeredAddress || '');
        setContactEmail(data.contactEmail || '');
        setContactPhone(data.contactPhone || '');
        setWebsiteUrl(data.websiteUrl || '');
        setGstin(data.gstin || '');
        setLogoUrl(data.logoUrl || '');
        setQuotationTerms(data.quotationTerms || '');
        setBankDetails(data.bankDetails || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load company profile');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setError(null);

    const payload: UpdateCompanyProfile = {
      companyName: companyName.trim(),
      tradingName: tradingName.trim() || null,
      registeredAddress: registeredAddress.trim() || null,
      contactEmail: contactEmail.trim() || null,
      contactPhone: contactPhone.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      gstin: gstin.trim() || null,
      logoUrl: logoUrl.trim() || null,
      quotationTerms: quotationTerms.trim() || null,
      bankDetails: bankDetails.trim() || null,
    };

    try {
      const updated = await apiClient.settings.updateCompanyProfile(payload);
      setProfile(updated);
      setSuccessMessage('Company profile and quotation branding updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading company settings..." />;
  if (error && !profile)
    return <ErrorState title="Settings Error" message={error} retry={fetchProfile} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Company Settings & Branding
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure legal entity details, tax identification, and defaults for generated quotation
          documents.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <CompanyIdentityFields
          companyName={companyName}
          setCompanyName={setCompanyName}
          tradingName={tradingName}
          setTradingName={setTradingName}
          registeredAddress={registeredAddress}
          setRegisteredAddress={setRegisteredAddress}
          contactPhone={contactPhone}
          setContactPhone={setContactPhone}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          websiteUrl={websiteUrl}
          setWebsiteUrl={setWebsiteUrl}
          gstin={gstin}
          setGstin={setGstin}
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
        />

        {/* Quotation Defaults */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Quotation Document Defaults</h2>
          <div>
            <label htmlFor="quotationTerms" className="block text-xs font-semibold text-slate-700">
              Default Terms & Conditions
            </label>
            <textarea
              id="quotationTerms"
              rows={3}
              value={quotationTerms}
              onChange={(e) => setQuotationTerms(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="bankDetails" className="block text-xs font-semibold text-slate-700">
              Bank Account & RTGS/NEFT Details
            </label>
            <textarea
              id="bankDetails"
              rows={3}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="touch-target inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {saving ? 'Saving Settings...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

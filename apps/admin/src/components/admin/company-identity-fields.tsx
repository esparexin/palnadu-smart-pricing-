'use client';

import React from 'react';

export interface CompanyIdentityFieldsProps {
  companyName: string;
  setCompanyName: (v: string) => void;
  tradingName: string;
  setTradingName: (v: string) => void;
  registeredAddress: string;
  setRegisteredAddress: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (v: string) => void;
  gstin: string;
  setGstin: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
}

export function CompanyIdentityFields({
  companyName,
  setCompanyName,
  tradingName,
  setTradingName,
  registeredAddress,
  setRegisteredAddress,
  contactPhone,
  setContactPhone,
  contactEmail,
  setContactEmail,
  websiteUrl,
  setWebsiteUrl,
  gstin,
  setGstin,
  logoUrl,
  setLogoUrl,
}: CompanyIdentityFieldsProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-base font-bold text-slate-900">Organization Identity</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="companyName" className="block text-xs font-semibold text-slate-700">
            Company Legal Name <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="tradingName" className="block text-xs font-semibold text-slate-700">
            Trading / Brand Name
          </label>
          <input
            id="tradingName"
            type="text"
            value={tradingName}
            onChange={(e) => setTradingName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>
      </div>

      <div>
        <label htmlFor="registeredAddress" className="block text-xs font-semibold text-slate-700">
          Registered Business Address
        </label>
        <textarea
          id="registeredAddress"
          rows={2}
          value={registeredAddress}
          onChange={(e) => setRegisteredAddress(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="contactPhone" className="block text-xs font-semibold text-slate-700">
            Contact Phone
          </label>
          <input
            id="contactPhone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="contactEmail" className="block text-xs font-semibold text-slate-700">
            Contact Email
          </label>
          <input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="websiteUrl" className="block text-xs font-semibold text-slate-700">
            Website URL
          </label>
          <input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="gstin" className="block text-xs font-semibold text-slate-700">
            GSTIN / Tax ID
          </label>
          <input
            id="gstin"
            type="text"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            placeholder="e.g. 37AAAAA0000A1Z5"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        <div>
          <label htmlFor="logoUrl" className="block text-xs font-semibold text-slate-700">
            Logo URL (Optional)
          </label>
          <input
            id="logoUrl"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
          />
        </div>
      </div>
    </section>
  );
}

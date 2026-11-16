import React from 'react';
import type { AdminQuotationDetail, CompanyProfile } from '@palnadu/contracts';

export function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function CompanyContactInfo({ profile }: { profile: CompanyProfile | null }) {
  if (!profile) return null;
  return (
    <>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
        {profile.contactPhone && <span>Phone: {profile.contactPhone}</span>}
        {profile.contactEmail && <span>Email: {profile.contactEmail}</span>}
        {profile.websiteUrl && <span>Web: {profile.websiteUrl}</span>}
      </div>
      {profile.gstin && (
        <p className="text-xs font-mono font-bold text-slate-700">GSTIN: {profile.gstin}</p>
      )}
    </>
  );
}

export function QuotationDocumentHeader({
  profile,
  quotation,
}: {
  profile: CompanyProfile | null;
  quotation: AdminQuotationDetail;
}) {
  const formattedDate = new Date(quotation.updatedAt || quotation.createdAt).toLocaleDateString();

  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {profile?.companyName || 'Palnadu Solar & Electricals'}
        </h1>
        {profile?.tradingName && (
          <p className="text-sm font-semibold text-slate-600">{profile.tradingName}</p>
        )}
        {profile?.registeredAddress && (
          <p className="text-xs text-slate-500 whitespace-pre-line max-w-sm">
            {profile.registeredAddress}
          </p>
        )}
        <CompanyContactInfo profile={profile} />
      </div>

      <div className="sm:text-right space-y-1">
        <div className="inline-block rounded bg-slate-900 px-3 py-1 text-xs font-black tracking-wider text-white uppercase">
          Official Quotation
        </div>
        <div className="mt-2 font-mono text-lg font-black text-blue-600">
          {quotation.referenceNumber}
        </div>
        <p className="text-xs text-slate-500">
          Date: <span className="font-medium text-slate-800">{formattedDate}</span>
        </p>
        <p className="text-xs text-slate-500">
          Status: <span className="font-bold uppercase text-slate-900">{quotation.status}</span>
        </p>
      </div>
    </div>
  );
}

export function QuotationBillTo({ quotation }: { quotation: AdminQuotationDetail }) {
  return (
    <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 border border-slate-100">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Quotation Prepared For:
        </div>
        <div className="mt-1 text-sm font-bold text-slate-900">{quotation.customerName}</div>
        {quotation.customerPhone && (
          <div className="text-xs text-slate-600">Phone: {quotation.customerPhone}</div>
        )}
        {quotation.customerEmail && (
          <div className="text-xs text-slate-600">Email: {quotation.customerEmail}</div>
        )}
      </div>
      {quotation.customerNotes && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Project / Site Notes:
          </div>
          <div className="mt-1 text-xs text-slate-600 italic whitespace-pre-line">
            {quotation.customerNotes}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuotationTotals({ quotation }: { quotation: AdminQuotationDetail }) {
  return (
    <div className="my-6 flex justify-end">
      <div className="w-full sm:w-80 space-y-2 border-t-2 border-slate-300 pt-3 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Gross Subtotal:</span>
          <span className="font-mono font-semibold">{formatInr(quotation.subtotalPaise)}</span>
        </div>
        {quotation.discountTotalPaise > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Total Product Savings:</span>
            <span className="font-mono font-bold">-{formatInr(quotation.discountTotalPaise)}</span>
          </div>
        )}
        <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-sm font-black text-slate-900">
          <span>Grand Total:</span>
          <span className="font-mono text-base text-blue-600">
            {formatInr(quotation.grandTotalPaise)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function QuotationFooter({ profile }: { profile: CompanyProfile | null }) {
  return (
    <>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-200 pt-6 text-[11px] text-slate-600">
        <div>
          <div className="font-bold uppercase tracking-wider text-slate-900 mb-1">
            Terms & Conditions:
          </div>
          <div className="whitespace-pre-line leading-relaxed">
            {profile?.quotationTerms || 'Standard commercial supply terms apply.'}
          </div>
        </div>
        <div>
          <div className="font-bold uppercase tracking-wider text-slate-900 mb-1">
            Bank Payment Instructions:
          </div>
          <div className="whitespace-pre-line leading-relaxed font-mono">
            {profile?.bankDetails || 'Contact sales desk for RTGS/NEFT details.'}
          </div>
        </div>
      </div>

      <div className="mt-12 flex justify-between items-end pt-8 border-t border-slate-100 text-xs">
        <div className="text-[11px] text-slate-400">
          System Generated Quotation • {profile?.companyName || 'Palnadu Smart Pricing'}
        </div>
        <div className="text-center">
          <div className="w-48 border-b border-slate-400 mb-1"></div>
          <div className="font-bold text-slate-800">Authorized Signatory</div>
          <div className="text-[10px] text-slate-500">Commercial Operations</div>
        </div>
      </div>
    </>
  );
}

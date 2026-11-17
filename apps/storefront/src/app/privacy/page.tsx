import React from 'react';
import Link from 'next/link';
import { StorefrontHeader } from '../../components/storefront/storefront-header';
import { StorefrontFooter } from '../../components/storefront/storefront-footer';

export const metadata = {
  title: 'Privacy Policy — Palnadu Smart Pricing',
  description:
    'Factual data collection and WhatsApp communication disclosures for Palnadu Smart Pricing.',
};

const FACTUAL_DATA_POINTS = [
  {
    field: 'Customer / Organization Name',
    requirement: 'Mandatory',
    purpose: 'Used exclusively to identify quotation estimate requests in backend persistence.',
  },
  {
    field: 'Phone / Mobile Number',
    requirement: 'Optional',
    purpose:
      'Used solely for automated Meta WhatsApp Cloud API quotation delivery and status updates.',
  },
  {
    field: 'Email Address',
    requirement: 'Optional',
    purpose: 'Used for quotation estimate communication if provided by the customer.',
  },
  {
    field: 'Project / Specification Notes',
    requirement: 'Optional',
    purpose:
      'Used by sales engineering to understand custom equipment, voltage, or delivery needs.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600 focus:outline-none focus:underline">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">Privacy Policy</span>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Privacy Policy
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Customer Information Collection & Communication Disclosures
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              BLOCKED — AWAITING OWNER CONTENT
            </span>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
            <div className="font-bold uppercase tracking-wider mb-1">Status Notice</div>
            <p className="leading-relaxed">
              Formal privacy policy terms, retention schedules, and legal representations are
              pending formal legal review and owner authorization. In accordance with platform
              governance, unapproved data protection claims or legal bases are not invented. Below
              is the verified factual inventory of data collected by the current implementation.
            </p>
          </div>

          <section className="mt-8">
            <h2 className="text-base font-bold text-slate-900">
              1. Factual Customer Data Collected
            </h2>
            <p className="mt-2 text-xs text-slate-600">
              Palnadu Smart Pricing operates strictly on a quotation-request model without mandatory
              customer accounts:
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Data Field
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Verified Technical Purpose
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                  {FACTUAL_DATA_POINTS.map((dp) => (
                    <tr key={dp.field}>
                      <td className="px-4 py-3 font-medium text-slate-900">{dp.field}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 font-semibold text-[11px] ${
                            dp.requirement === 'Mandatory'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {dp.requirement}
                        </span>
                      </td>
                      <td className="px-4 py-3 leading-relaxed">{dp.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-base font-bold text-slate-900">
              2. Data Strictly NOT Collected or Processed
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs text-slate-600">
              <li>No customer account credentials, logins, or passwords.</li>
              <li>No online checkout, payment gateways, credit cards, or banking information.</li>
              <li>No order fulfillment, dispatch tracking, or shipment delivery addresses.</li>
              <li>No customer credit balances or financial sales ledgers.</li>
            </ul>
          </section>

          <div className="mt-10 border-t border-slate-200 pt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Return to Catalogue
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              View Terms & Conditions
            </Link>
          </div>
        </article>
      </main>

      <StorefrontFooter />
    </div>
  );
}

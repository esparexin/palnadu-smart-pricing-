import React from 'react';
import Link from 'next/link';
import { PRICING_DISCLOSURES } from '@palnadu/contracts';
import { StorefrontHeader } from '../../components/storefront/storefront-header';
import { StorefrontFooter } from '../../components/storefront/storefront-footer';

export const metadata = {
  title: 'Terms & Conditions — Palnadu Smart Pricing',
  description:
    'Commercial terms and pricing disclosure policy for Palnadu Smart Pricing quotation requests.',
};

const REQUIRED_TERMS_TOPICS = [
  'Quotation validity periods and acceptance timelines',
  'Indicative estimate/quotation price disclosure',
  'Price variation at the time of purchase based on market conditions',
  'Possibility of additional commercial offers or discounts during purchase',
  'Market-challenging quotation process for competitive offers',
  'Equipment, product, and stock availability disclaimers',
  'Supplier pricing and manufacturer cost condition adjustments',
  'Final commercial terms and binding pricing confirmation protocol',
  'Commercial procurement terms and B2B delivery logistics',
  'Applicable cancellation, modification, and custom order terms',
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <StorefrontHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600 focus:outline-none focus:underline">
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">Terms & Conditions</span>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Terms & Conditions
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Commercial Quotation Policy & Pricing Disclosures
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              BLOCKED — AWAITING OWNER CONTENT
            </span>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900">
            <div className="font-bold uppercase tracking-wider mb-1">Status Notice</div>
            <p className="leading-relaxed">
              Formal contractual terms, legal conditions, and validity durations are currently under
              review by repository management. In accordance with platform governance, unapproved
              legal obligations are not invented. The approved pricing transparency disclosure below
              governs all public catalogue estimates.
            </p>
          </div>

          <section className="mt-8">
            <h2 className="text-base font-bold text-slate-900">
              1. Approved Pricing Transparency Disclosure
            </h2>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 leading-relaxed">
              {PRICING_DISCLOSURES.PRIMARY}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-base font-bold text-slate-900">
              2. Terms & Conditions Specification Checklist
            </h2>
            <p className="mt-2 text-xs text-slate-600">
              The following topics are pending formal contractual wording confirmation from the
              repository owner:
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs text-slate-700">
              {REQUIRED_TERMS_TOPICS.map((topic, idx) => (
                <li key={idx} className="leading-relaxed">
                  <span className="font-medium text-slate-900">{topic}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-10 border-t border-slate-200 pt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Return to Catalogue
            </Link>
            <Link
              href="/privacy"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              View Privacy Policy
            </Link>
          </div>
        </article>
      </main>

      <StorefrontFooter />
    </div>
  );
}

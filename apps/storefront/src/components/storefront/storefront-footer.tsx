import React from 'react';
import Link from 'next/link';

export function StorefrontFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-slate-900 uppercase">
              Palnadu Smart Pricing
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Commercial equipment catalogue and authoritative pricing discovery. Request custom
              quotations for projects and volume orders.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-slate-900 uppercase">
              Navigation
            </h3>
            <ul className="mt-2 space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-slate-600 hover:text-blue-600 focus:outline-none focus:underline"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-slate-600 hover:text-blue-600 focus:outline-none focus:underline"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-sm text-slate-600 hover:text-blue-600 focus:outline-none focus:underline"
                >
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-slate-900 uppercase">
              Price Privacy & Enquiries
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Prices and bulk rates are confidential and calculated on a per-quotation basis. Add
              products to your enquiry request to receive an authoritative quote snapshot.
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Palnadu Smart Pricing. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

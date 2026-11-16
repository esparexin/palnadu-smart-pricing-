'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/auth-context';
import { apiClient } from '../../lib/api-client';
import { QuotationCommercialSummary } from '../../components/admin/quotation-commercial-summary';

interface ModuleConfig {
  title: string;
  description: string;
  href: string;
  badgeBg: string;
  textColor: string;
  iconPath: string;
}

const MODULES: ModuleConfig[] = [
  {
    title: 'Products & Variants',
    description:
      'Browse products, inspect variants, configure SKU specifications and view relationships.',
    href: '/admin/products',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    textColor: 'text-emerald-700 hover:text-emerald-800',
    iconPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  },
  {
    title: 'Brands',
    description:
      'Manage manufacturer brands, brand codes, websites, and associated active product counts.',
    href: '/admin/brands',
    badgeBg: 'bg-sky-100 text-sky-800',
    textColor: 'text-sky-700 hover:text-sky-800',
    iconPath:
      'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  },
  {
    title: 'Categories Hierarchy',
    description:
      'Organize hierarchical taxonomies with database-level cycle protection and display order.',
    href: '/admin/categories',
    badgeBg: 'bg-amber-100 text-amber-800',
    textColor: 'text-amber-700 hover:text-amber-800',
    iconPath: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  },
];

export default function AdminDashboardPage() {
  const { user, hasPermission } = useAuth();
  const [systemStatus, setSystemStatus] = useState<'checking' | 'healthy' | 'unhealthy'>(
    'checking',
  );

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getReadiness()
      .then(() => {
        if (isMounted) setSystemStatus('healthy');
      })
      .catch(() => {
        if (isMounted) setSystemStatus('unhealthy');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const canReadCatalogue = hasPermission('catalogue:read') || hasPermission('catalogue:manage');
  const canManageCatalogue = hasPermission('catalogue:manage');
  const canReadQuotations =
    hasPermission('quotations:read') ||
    hasPermission('quotations:manage') ||
    hasPermission('admin:manage');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-2xl text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Palnadu Smart Pricing Catalogue &amp; Operational Management Portal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                systemStatus === 'healthy'
                  ? 'bg-emerald-500'
                  : systemStatus === 'unhealthy'
                    ? 'bg-red-500'
                    : 'bg-amber-500 animate-pulse'
              }`}
              aria-hidden="true"
            />
            <span className="font-medium text-xs text-slate-600 capitalize">
              API {systemStatus}
            </span>
          </div>
        </div>

        {user && (
          <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div>
              <span className="text-slate-400">Signed in as:</span>{' '}
              <strong className="font-semibold text-slate-800">{user.name}</strong> ({user.email})
            </div>
            <div>
              <span className="text-slate-400">Account status:</span>{' '}
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-xs text-emerald-700 capitalize">
                {user.status}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Catalogue access:</span>{' '}
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-xs text-slate-800">
                {canManageCatalogue
                  ? 'Full Edit Access'
                  : canReadCatalogue
                    ? 'Read Only'
                    : 'No Access'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-base text-slate-900">Your Granted Permissions</h2>
        <p className="mt-1 text-xs text-slate-500">
          Permissions enforced across catalogue API endpoints and administrative interfaces.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {user?.permissions.map((permission: string) => (
            <span
              key={permission}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700"
            >
              {permission}
            </span>
          ))}
          {(!user?.permissions || user.permissions.length === 0) && (
            <span className="text-xs text-slate-400 italic">No explicit permissions assigned.</span>
          )}
        </div>
      </div>

      {canReadQuotations && <QuotationCommercialSummary />}

      <div>
        <h2 className="font-semibold text-lg text-slate-900">Catalogue Management Modules</h2>
        <p className="mt-1 text-xs text-slate-500">
          Operational modules for catalogue browsing, maintenance, and relationships.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <div
              key={module.title}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
            >
              <div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${module.badgeBg}`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={module.iconPath}
                    />
                  </svg>
                </div>
                <h3 className="mt-4 font-semibold text-base text-slate-900">{module.title}</h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{module.description}</p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100">
                {canReadCatalogue ? (
                  <Link
                    href={module.href}
                    className={`font-medium text-sm inline-flex items-center gap-1 ${module.textColor}`}
                  >
                    <span>Open {module.title.split(' ')[0]}</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400">Requires catalogue:read permission</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

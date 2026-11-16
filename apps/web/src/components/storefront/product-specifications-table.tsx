import React from 'react';
import type { PublicProductDto } from '@palnadu/contracts';

export interface ProductSpecificationsTableProps {
  product: PublicProductDto;
}

export function ProductSpecificationsTable({ product }: ProductSpecificationsTableProps) {
  const specs = Object.entries(product.specifications || {});

  return (
    <div className="space-y-6">
      {/* Specifications */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Technical Specifications</h2>
        {specs.length > 0 ? (
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
            {specs.map(([key, val]) => (
              <div key={key} className="grid grid-cols-1 py-3 sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-slate-500 capitalize">{key}</dt>
                <dd className="text-sm text-slate-900 sm:col-span-2 font-mono">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500 italic">
            Standard commercial specifications apply. Contact us for custom configurations.
          </p>
        )}
      </section>

      {/* Available Variants */}
      {product.variants.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Available Models & Configurations</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Model
                  </th>
                  <th scope="col" className="px-4 py-3">
                    SKU
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Configuration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.variants.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{v.model || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.sku || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {Object.keys(v.options || {}).length > 0
                        ? Object.entries(v.options)
                            .map(([k, val]) => `${k}: ${String(val)}`)
                            .join(', ')
                        : 'Standard'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

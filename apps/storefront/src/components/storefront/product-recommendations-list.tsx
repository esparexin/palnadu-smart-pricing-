'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PublicRecommendationItem } from '@palnadu/contracts';
import { ApiClient } from '../../lib/api-client';

const apiClient = new ApiClient();

export interface ProductRecommendationsListProps {
  productId: string;
}

export function ProductRecommendationsList({ productId }: ProductRecommendationsListProps) {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<PublicRecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.storefront
      .getRecommendations(productId)
      .then((items) => {
        setRecommendations(items);
        setLoading(false);
      })
      .catch(() => {
        setRecommendations([]);
        setLoading(false);
      });
  }, [productId]);

  if (loading || recommendations.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">Compatible & Recommended Equipment</h2>
      <p className="mt-1 text-xs text-slate-500">
        Frequently paired commercial hardware and mounting accessories.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => {
          const target = rec.product;
          const image = target.images[0];
          return (
            <div
              key={target.id}
              onClick={() => router.push(`/products/${target.slug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') router.push(`/products/${target.slug}`);
              }}
              tabIndex={0}
              role="link"
              aria-label={`View ${target.name}`}
              className="flex flex-col justify-between rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:shadow-sm transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 flex-shrink-0 bg-slate-50 rounded border border-slate-100 flex items-center justify-center overflow-hidden">
                  {image ? (
                    <img
                      src={image.url}
                      alt={image.altText || target.name}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xs text-slate-300 font-bold">P</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                    {rec.relationshipType}
                  </span>
                  <h4 className="mt-1 text-xs font-semibold text-slate-900 truncate break-words">
                    <Link
                      href={`/products/${target.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-blue-600 focus:outline-none focus:underline"
                    >
                      {target.name}
                    </Link>
                  </h4>
                  {rec.notes && (
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1 break-words">
                      {rec.notes}
                    </p>
                  )}
                </div>
              </div>

              <div
                className="mt-3 pt-2 border-t border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  href={`/products/${target.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex min-h-[44px] items-center justify-center text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View Equipment &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

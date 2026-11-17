'use client';

import React, { useState } from 'react';

export interface BrandLogoProps {
  slug: string;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export const KNOWN_BRAND_SLUGS: ReadonlySet<string> = new Set([
  'hanwha-vision',
  'panasonic',
  'i-pro',
  'axis',
  'honeywell',
  'sony',
  'hikvision',
  'dahua',
  'uniview',
  'vivotek',
  'cp-plus',
  'hi-focus',
  'secureye',
  'sparsh',
  'trueview',
  'godrej',
  'ezviz',
  'tp-link',
  'reolink',
]);

export function BrandLogo({
  slug,
  name,
  className = 'h-6 w-auto max-w-[120px] object-contain',
  fallbackClassName = 'inline-flex items-center text-xs font-semibold text-slate-800',
}: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);
  const normalizedSlug = slug.trim().toLowerCase();
  const isKnown = KNOWN_BRAND_SLUGS.has(normalizedSlug);

  if (!isKnown || hasError) {
    return React.createElement('span', { className: fallbackClassName }, name);
  }

  return React.createElement('img', {
    src: `/brands/${normalizedSlug}.svg`,
    alt: `${name} logo`,
    loading: 'lazy',
    decoding: 'async',
    onError: () => setHasError(true),
    className,
  });
}

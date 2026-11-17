import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { BrandLogo } from './brand-logo.js';
import { CANONICAL_BRANDS } from '@palnadu/contracts';

describe('BrandLogo component', () => {
  it('renders verified SVG logo image tag for all 19 canonical brands', () => {
    for (const brand of CANONICAL_BRANDS) {
      const html = renderToString(
        React.createElement(BrandLogo, { slug: brand.slug, name: brand.name }),
      );
      expect(html).toContain(`src="/brands/${brand.slug}.svg"`);
      expect(html).toContain(`alt="${brand.name} logo"`);
      expect(html).toContain('loading="lazy"');
    }
  });

  it('renders clean text fallback for unverified or unknown brands', () => {
    const html = renderToString(
      React.createElement(BrandLogo, { slug: 'unrecognized-brand', name: 'Unknown Surveillance' }),
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('Unknown Surveillance');
  });

  it('never substitutes an unrelated brand logo for an unknown brand', () => {
    const html = renderToString(
      React.createElement(BrandLogo, { slug: 'random-brand', name: 'Random Brand' }),
    );
    for (const b of CANONICAL_BRANDS) {
      expect(html).not.toContain(`/brands/${b.slug}.svg`);
    }
  });

  it('accepts custom className and maintains layout aspect-ratio classes', () => {
    const html = renderToString(
      React.createElement(BrandLogo, {
        slug: 'hikvision',
        name: 'Hikvision',
        className: 'h-8 w-auto object-contain custom-class',
      }),
    );
    expect(html).toContain('class="h-8 w-auto object-contain custom-class"');
  });
});

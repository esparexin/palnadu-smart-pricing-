import { describe, expect, it } from 'vitest';
import {
  CANONICAL_BRANDS,
  getCanonicalBrandByName,
  getCanonicalBrandBySlug,
  resolveCanonicalBrand,
} from './brand-registry.js';
import { SlugSchema } from './catalogue.js';

describe('Canonical Brand Registry', () => {
  it('contains exactly 19 approved canonical brands', () => {
    expect(CANONICAL_BRANDS).toHaveLength(19);
  });

  it('validates every canonical slug conforms to SlugSchema', () => {
    for (const b of CANONICAL_BRANDS) {
      expect(() => SlugSchema.parse(b.slug)).not.toThrow();
      expect(b.slug).toBe(b.slug.toLowerCase());
      expect(b.slug).not.toMatch(/--/);
    }
  });

  it('guarantees all canonical slugs and names are unique', () => {
    const slugs = new Set<string>();
    const names = new Set<string>();

    for (const b of CANONICAL_BRANDS) {
      const lowerSlug = b.slug.toLowerCase();
      const lowerName = b.name.toLowerCase();

      expect(slugs.has(lowerSlug)).toBe(false);
      expect(names.has(lowerName)).toBe(false);

      slugs.add(lowerSlug);
      names.add(lowerName);
    }
  });

  it('retrieves canonical brands by slug or name', () => {
    const brand = getCanonicalBrandBySlug('hanwha-vision');
    expect(brand).toBeDefined();
    expect(brand?.name).toBe('Hanwha Vision');

    const byName = getCanonicalBrandByName('Hanwha Vision');
    expect(byName?.slug).toBe('hanwha-vision');
  });

  describe('Owner Decisions Enforcement', () => {
    it('Decision 1: Keeps Panasonic and i-PRO as separate canonical brands', () => {
      const panasonic = getCanonicalBrandBySlug('panasonic');
      const ipro = getCanonicalBrandBySlug('i-pro');

      expect(panasonic).toBeDefined();
      expect(panasonic?.name).toBe('Panasonic');

      expect(ipro).toBeDefined();
      expect(ipro?.name).toBe('i-PRO');
    });

    it('Decision 1: Flags combined "Panasonic / i-PRO" as ambiguous', () => {
      const res = resolveCanonicalBrand('Panasonic / i-PRO');
      expect(res.status).toBe('ambiguous');
      if (res.status === 'ambiguous') {
        expect(res.candidateSlugs).toEqual(['panasonic', 'i-pro']);
      }

      const resNoSpace = resolveCanonicalBrand('Panasonic/i-PRO');
      expect(resNoSpace.status).toBe('ambiguous');
    });

    it('Decision 2: Maps Tapo and VIGI to umbrella brand TP-Link', () => {
      const tapoRes = resolveCanonicalBrand('Tapo');
      expect(tapoRes.status).toBe('alias');
      if (tapoRes.status === 'alias') {
        expect(tapoRes.brand.slug).toBe('tp-link');
      }

      const vigiRes = resolveCanonicalBrand('TP-Link VIGI');
      expect(vigiRes.status).toBe('alias');
      if (vigiRes.status === 'alias') {
        expect(vigiRes.brand.slug).toBe('tp-link');
      }

      const directRes = resolveCanonicalBrand('TP-Link');
      expect(directRes.status).toBe('canonical');
      if (directRes.status === 'canonical') {
        expect(directRes.brand.slug).toBe('tp-link');
      }
    });

    it('Decision 3: Canonicalizes Axis to Axis Communications with slug "axis"', () => {
      const slugRes = resolveCanonicalBrand('axis');
      expect(['canonical', 'alias']).toContain(slugRes.status);
      if ('brand' in slugRes) {
        expect(slugRes.brand.name).toBe('Axis Communications');
        expect(slugRes.brand.slug).toBe('axis');
      }

      const aliasRes = resolveCanonicalBrand('axis communications ab');
      expect(aliasRes.status).toBe('alias');
      if (aliasRes.status === 'alias') {
        expect(aliasRes.brand.slug).toBe('axis');
      }

      const canonicalRes = resolveCanonicalBrand('Axis Communications');
      expect(canonicalRes.status).toBe('canonical');
      if (canonicalRes.status === 'canonical') {
        expect(canonicalRes.brand.slug).toBe('axis');
      }
    });

    it('Decision 4: Canonicalizes Godrej to Godrej Security Solutions with slug "godrej"', () => {
      const slugRes = resolveCanonicalBrand('godrej');
      expect(['canonical', 'alias']).toContain(slugRes.status);
      if ('brand' in slugRes) {
        expect(slugRes.brand.name).toBe('Godrej Security Solutions');
        expect(slugRes.brand.slug).toBe('godrej');
      }

      const aliasRes = resolveCanonicalBrand('godrej & boyce');
      expect(aliasRes.status).toBe('alias');
      if (aliasRes.status === 'alias') {
        expect(aliasRes.brand.slug).toBe('godrej');
      }

      const canonicalRes = resolveCanonicalBrand('Godrej Security Solutions');
      expect(canonicalRes.status).toBe('canonical');
      if (canonicalRes.status === 'canonical') {
        expect(canonicalRes.brand.slug).toBe('godrej');
      }
    });
  });

  describe('Alias Resolution & Unresolved Fallback', () => {
    it('resolves common aliases for CP PLUS, Uniview, and Hi-Focus', () => {
      const cpPlusWorld = resolveCanonicalBrand('CP Plus World');
      expect(cpPlusWorld.status).toBe('alias');
      if (cpPlusWorld.status === 'alias') expect(cpPlusWorld.brand.slug).toBe('cp-plus');

      const unv = resolveCanonicalBrand('UNV');
      expect(unv.status).toBe('alias');
      if (unv.status === 'alias') expect(unv.brand.slug).toBe('uniview');

      const hifocus = resolveCanonicalBrand('hifocus electronics');
      expect(hifocus.status).toBe('alias');
      if (hifocus.status === 'alias') expect(hifocus.brand.slug).toBe('hi-focus');
    });

    it('returns unresolved for unknown brands without inventing records', () => {
      const res = resolveCanonicalBrand('Acme Cameras Inc');
      expect(res.status).toBe('unresolved');
    });
  });
});

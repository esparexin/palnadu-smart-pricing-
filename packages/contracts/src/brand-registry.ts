import { type CanonicalBrand, CANONICAL_BRANDS, AMBIGUOUS_BRAND_ALIASES } from './brand-data.js';

export { type CanonicalBrand, CANONICAL_BRANDS, AMBIGUOUS_BRAND_ALIASES };

export type BrandResolutionResult =
  | { status: 'canonical'; brand: CanonicalBrand }
  | { status: 'alias'; brand: CanonicalBrand; matchedAlias: string }
  | { status: 'ambiguous'; rawInput: string; candidateSlugs: readonly string[]; reason: string }
  | { status: 'unresolved'; rawInput: string };

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

const CANONICAL_BY_SLUG = new Map<string, CanonicalBrand>();
const CANONICAL_BY_NAME = new Map<string, CanonicalBrand>();
const ALIAS_TO_BRAND = new Map<string, { brand: CanonicalBrand; matchedAlias: string }>();

for (const b of CANONICAL_BRANDS) {
  CANONICAL_BY_SLUG.set(b.slug, b);
  CANONICAL_BY_NAME.set(normalizeKey(b.name), b);
  for (const alias of b.aliases) {
    ALIAS_TO_BRAND.set(normalizeKey(alias), { brand: b, matchedAlias: alias });
  }
}

export function getCanonicalBrandBySlug(slug: string): CanonicalBrand | undefined {
  return CANONICAL_BY_SLUG.get(slug.trim().toLowerCase());
}

export function getCanonicalBrandByName(name: string): CanonicalBrand | undefined {
  return CANONICAL_BY_NAME.get(normalizeKey(name));
}

export function resolveCanonicalBrand(input: string): BrandResolutionResult {
  const norm = normalizeKey(input);
  if (!norm) return { status: 'unresolved', rawInput: input };

  const bySlug = CANONICAL_BY_SLUG.get(norm);
  if (bySlug) return { status: 'canonical', brand: bySlug };

  const byName = CANONICAL_BY_NAME.get(norm);
  if (byName) return { status: 'canonical', brand: byName };

  const ambiguous = AMBIGUOUS_BRAND_ALIASES.get(norm);
  if (ambiguous) {
    return {
      status: 'ambiguous',
      rawInput: input,
      candidateSlugs: ambiguous.candidateSlugs,
      reason: ambiguous.reason,
    };
  }

  const aliasMatch = ALIAS_TO_BRAND.get(norm);
  if (aliasMatch) {
    return { status: 'alias', brand: aliasMatch.brand, matchedAlias: aliasMatch.matchedAlias };
  }

  return { status: 'unresolved', rawInput: input };
}

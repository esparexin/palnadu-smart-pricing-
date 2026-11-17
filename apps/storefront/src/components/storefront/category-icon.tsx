import React from 'react';

export interface CategoryIconProps {
  name: string;
  slug?: string;
  className?: string;
}

const CATEGORY_PATTERNS = [
  { match: /camera|cctv|surveillance|dome|bullet|ptz/i, key: 'camera' },
  { match: /nvr|dvr|recorder|vms/i, key: 'recorder' },
  { match: /network|switch|router|poe|wifi|access point/i, key: 'network' },
  { match: /storage|hdd|ssd|drive|disk|card/i, key: 'storage' },
  { match: /access|biometric|security|lock|door|attendance/i, key: 'security' },
  { match: /cable|wire|power|connector|accessory|enclosure/i, key: 'power' },
] as const;

function resolveCategoryKey(name: string, slug: string): string {
  const combined = `${name} ${slug}`;
  const found = CATEGORY_PATTERNS.find((p) => p.match.test(combined));
  return found?.key ?? 'default';
}

const ICON_PATHS: Record<string, React.ReactNode> = {
  camera: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
    />
  ),
  recorder: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  ),
  network: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
    />
  ),
  storage: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zm0 5h16M7 16h.01M7 8h.01"
    />
  ),
  security: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  ),
  power: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  ),
  default: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
    />
  ),
};

export function CategoryIcon({ name, slug = '', className = 'h-5 w-5' }: CategoryIconProps) {
  const iconKey = resolveCategoryKey(name, slug);
  const pathElement = ICON_PATHS[iconKey] ?? ICON_PATHS.default;

  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      {pathElement}
    </svg>
  );
}

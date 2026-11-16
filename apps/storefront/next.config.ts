import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

function resolveRootEnvConfig(): string | undefined {
  try {
    const rootEnvPath = path.resolve(process.cwd(), '../../.env');
    if (fs.existsSync(rootEnvPath)) {
      const content = fs.readFileSync(rootEnvPath, 'utf8');
      const match = content.match(/^(?:API_INTERNAL_URL|NEXT_PUBLIC_API_URL)\s*=\s*(.+)$/m);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // Ignore root env resolution error
  }
  return undefined;
}

function isProductionBuild(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }
  if (process.env.APP_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return true;
  }
  return !fs.existsSync(path.resolve(process.cwd(), '../../.git'));
}

function resolveApiUrl(): string {
  const configured =
    process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || resolveRootEnvConfig();

  if (configured && configured.trim().length > 0) {
    return configured.trim().replace(/\/$/, '');
  }

  const isCi = Boolean(process.env.CI);
  const isDev = process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'development';
  if (isCi || isDev) {
    return 'http://127.0.0.1:3001';
  }

  if (isProductionBuild()) {
    throw new Error(
      'Production build requires an explicitly configured API_INTERNAL_URL or NEXT_PUBLIC_API_URL environment variable.',
    );
  }

  return 'http://127.0.0.1:3001';
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiUrl = resolveApiUrl();

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

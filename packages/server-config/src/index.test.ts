import { describe, expect, it } from 'vitest';
import { DEV_SESSION_SECRET, parseServerConfig, TEST_SESSION_SECRET } from './index.js';

describe('parseServerConfig', () => {
  it('applies centralized development defaults', () => {
    expect(
      parseServerConfig({ DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog' }),
    ).toEqual({
      databaseUrl: 'postgres://user:pass@localhost:5432/catalog',
      databasePoolMax: 5,
      host: '127.0.0.1',
      logLevel: 'info',
      nodeEnv: 'development',
      port: 3001,
      sessionSecret: DEV_SESSION_SECRET,
      sessionTtlHours: 12,
      allowedOrigins: [],
      storageDriver: 'memory',
      cloudinary: undefined,
    });
  });

  it('injects dedicated test secret when NODE_ENV is test', () => {
    const config = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/test',
      NODE_ENV: 'test',
    });

    expect(config.sessionSecret).toBe(TEST_SESSION_SECRET);
    expect(config.sessionTtlHours).toBe(12);
  });

  it('handles session secret requirements by environment safely', () => {
    // Production requires SESSION_SECRET
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/prod',
        NODE_ENV: 'production',
      }),
    ).toThrow('SESSION_SECRET is required in production');

    // Production rejects secrets shorter than 32 characters
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/prod',
        NODE_ENV: 'production',
        SESSION_SECRET: 'too-short-secret',
      }),
    ).toThrow('must be at least 32 characters in production');

    // Production rejects whitespace-only secret
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/prod',
        NODE_ENV: 'production',
        SESSION_SECRET: '   ',
      }),
    ).toThrow('SESSION_SECRET is required in production');

    // Production rejects default development/test secret
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/prod',
        NODE_ENV: 'production',
        SESSION_SECRET: DEV_SESSION_SECRET,
      }),
    ).toThrow('cannot use development or test defaults in production');

    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/prod',
        NODE_ENV: 'production',
        SESSION_SECRET: TEST_SESSION_SECRET,
      }),
    ).toThrow('cannot use development or test defaults in production');

    // Production accepts a valid secure secret without echoing it
    const validProdSecret = 'super-secure-production-secret-value-32chars!';
    const prodConfig = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/prod',
      NODE_ENV: 'production',
      SESSION_SECRET: validProdSecret,
    });
    expect(prodConfig.sessionSecret).toBe(validProdSecret);

    // Development and test fall back to defaults when empty or whitespace
    const devWhitespace = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/dev',
      NODE_ENV: 'development',
      SESSION_SECRET: '   ',
    });
    expect(devWhitespace.sessionSecret).toBe(DEV_SESSION_SECRET);

    const testWhitespace = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/test',
      NODE_ENV: 'test',
      SESSION_SECRET: '',
    });
    expect(testWhitespace.sessionSecret).toBe(TEST_SESSION_SECRET);

    // Development rejects short custom secret if provided
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/dev',
        SESSION_SECRET: 'short-dev-secret',
      }),
    ).toThrow('must be at least 32 characters if specified');
  });

  it('validates SESSION_TTL_HOURS range', () => {
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
        SESSION_TTL_HOURS: '0',
      }),
    ).toThrow('SESSION_TTL_HOURS');

    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
        SESSION_TTL_HOURS: '200',
      }),
    ).toThrow('SESSION_TTL_HOURS');

    const config = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
      SESSION_TTL_HOURS: '24',
    });
    expect(config.sessionTtlHours).toBe(24);
  });

  it('rejects missing and non-PostgreSQL connection strings without echoing values', () => {
    expect(() => parseServerConfig({})).toThrow('DATABASE_URL');
    const invalidProtocol = () =>
      parseServerConfig({ DATABASE_URL: 'mysql://user:secret@localhost/database' });
    expect(invalidProtocol).toThrow('Must use a PostgreSQL connection URL');
    expect(invalidProtocol).not.toThrow('secret');

    const invalidUrl = () => parseServerConfig({ DATABASE_URL: 'not-a-url' });
    expect(invalidUrl).toThrow();
    expect(invalidUrl).not.toThrow('not-a-url');
  });

  it('rejects invalid ports and pool sizes', () => {
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
        PORT: '70000',
        DB_POOL_MAX: '0',
      }),
    ).toThrow('PORT');
  });

  it('parses optional DATABASE_DIRECT_URL and DB_SSL', () => {
    const config = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@pooler.prisma.io:6543/db?pgbouncer=true',
      DATABASE_DIRECT_URL: 'postgres://user:pass@direct.prisma.io:5432/db',
      DB_SSL: 'require',
    });
    expect(config.databaseDirectUrl).toBe('postgres://user:pass@direct.prisma.io:5432/db');
    expect(config.dbSsl).toBe('require');
  });

  it('rejects non-PostgreSQL DATABASE_DIRECT_URL', () => {
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
        DATABASE_DIRECT_URL: 'mysql://user:pass@localhost:3306/db',
      }),
    ).toThrow('DATABASE_DIRECT_URL');
  });

  it('parses ALLOWED_ORIGINS safely and normalizes URLs', () => {
    const config = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
      ALLOWED_ORIGINS: 'https://admin.vercel.app, https://storefront.vercel.app/',
    });
    expect(config.allowedOrigins).toEqual([
      'https://admin.vercel.app',
      'https://storefront.vercel.app',
    ]);
  });

  it('rejects wildcard origin in production', () => {
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
        NODE_ENV: 'production',
        SESSION_SECRET: 'super-secure-production-secret-value-32chars!',
        ALLOWED_ORIGINS: '*',
      }),
    ).toThrow('ALLOWED_ORIGINS cannot contain wildcard in production');
  });

  it('rejects http non-secure origins in production', () => {
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
        NODE_ENV: 'production',
        SESSION_SECRET: 'super-secure-production-secret-value-32chars!',
        ALLOWED_ORIGINS: 'http://admin.example.com',
      }),
    ).toThrow('must use https in production');
  });

  it('configures Cloudinary when STORAGE_DRIVER is cloudinary', () => {
    const config = parseServerConfig({
      DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
      STORAGE_DRIVER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
    });
    expect(config.storageDriver).toBe('cloudinary');
    expect(config.cloudinary).toEqual({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });
  });

  it('rejects STORAGE_DRIVER cloudinary when credentials are missing', () => {
    expect(() =>
      parseServerConfig({
        DATABASE_URL: 'postgres://user:pass@localhost:5432/catalog',
        STORAGE_DRIVER: 'cloudinary',
      }),
    ).toThrow('CLOUDINARY_CLOUD_NAME');
  });
});

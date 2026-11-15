import { describe, expect, it } from 'vitest';
import { parseServerConfig } from './index.js';

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
    });
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
});

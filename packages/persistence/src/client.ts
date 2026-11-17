import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { ServerConfig } from '@palnadu/server-config';
import * as schema from './schema.js';

export function createDatabase(config: ServerConfig) {
  let ssl: 'require' | boolean | undefined;
  if (config.dbSsl === 'require' || config.nodeEnv === 'production') {
    ssl = 'require';
  } else if (config.dbSsl === 'disable') {
    ssl = false;
  } else if (
    config.databaseUrl.includes('sslmode=require') ||
    config.databaseUrl.includes('prisma.io')
  ) {
    ssl = 'require';
  }

  const client = postgres(config.databaseUrl, {
    connect_timeout: 10,
    idle_timeout: 60,
    max: config.databasePoolMax,
    ssl,
  });
  const db = drizzle(client, { schema });

  return {
    db,
    async ping(): Promise<void> {
      await client`select 1`;
    },
    close(): Promise<void> {
      return client.end({ timeout: 5 });
    },
  };
}

export type DatabaseClient = ReturnType<typeof createDatabase>;
export type DbExecutor =
  DatabaseClient['db'] | Parameters<Parameters<DatabaseClient['db']['transaction']>[0]>[0];

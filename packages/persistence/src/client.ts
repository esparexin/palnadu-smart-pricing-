import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { ServerConfig } from '@palnadu/server-config';
import * as schema from './schema.js';

export function createDatabase(config: ServerConfig) {
  const client = postgres(config.databaseUrl, {
    connect_timeout: 10,
    idle_timeout: 20,
    max: config.databasePoolMax,
    ssl: config.nodeEnv === 'production' ? 'require' : undefined,
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

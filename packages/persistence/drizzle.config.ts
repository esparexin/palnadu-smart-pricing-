import { defineConfig } from 'drizzle-kit';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseServerConfig } from '@palnadu/server-config';

const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const config = parseServerConfig(process.env);

export default defineConfig({
  dbCredentials: {
    url: config.databaseDirectUrl ?? config.databaseUrl,
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/schema.ts',
  strict: true,
  verbose: true,
});

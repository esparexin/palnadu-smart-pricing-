import { z } from 'zod';

const serverConfigSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), {
      message: 'Must use a PostgreSQL connection URL',
    }),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
});

export interface ServerConfig {
  databaseUrl: string;
  databasePoolMax: number;
  host: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
}

export function parseServerConfig(environment: Record<string, string | undefined>): ServerConfig {
  const parsed = serverConfigSchema.safeParse(environment);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'configuration';
      return `${field}: ${issue.message}`;
    });

    throw new Error(`Invalid server configuration: ${issues.join('; ')}`);
  }

  return {
    databaseUrl: parsed.data.DATABASE_URL,
    databasePoolMax: parsed.data.DB_POOL_MAX,
    host: parsed.data.HOST,
    logLevel: parsed.data.LOG_LEVEL,
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
  };
}

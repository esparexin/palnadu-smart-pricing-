import { z } from 'zod';

export const DEV_SESSION_SECRET =
  'palnadu-development-only-session-secret-not-for-production-use-min-32-chars';
export const TEST_SESSION_SECRET =
  'palnadu-test-only-session-secret-not-for-production-use-min-32-chars';

const serverConfigSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), {
      message: 'Must use a PostgreSQL connection URL',
    }),
  DATABASE_DIRECT_URL: z
    .string()
    .url()
    .refine((value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol), {
      message: 'Must use a PostgreSQL connection URL',
    })
    .optional(),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  DB_SSL: z.enum(['require', 'prefer', 'disable', 'allow']).optional(),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  SESSION_SECRET: z.string().trim().optional(),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
});

export interface ServerConfig {
  databaseUrl: string;
  databaseDirectUrl?: string;
  databasePoolMax: number;
  dbSsl?: 'require' | 'prefer' | 'disable' | 'allow';
  host: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  sessionSecret: string;
  sessionTtlHours: number;
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

  const {
    DATABASE_URL,
    DATABASE_DIRECT_URL,
    DB_POOL_MAX,
    DB_SSL,
    HOST,
    LOG_LEVEL,
    NODE_ENV,
    PORT,
    SESSION_SECRET,
    SESSION_TTL_HOURS,
  } = parsed.data;

  const effectiveSecret = SESSION_SECRET && SESSION_SECRET.length > 0 ? SESSION_SECRET : undefined;
  let sessionSecret: string;

  if (NODE_ENV === 'production') {
    if (!effectiveSecret) {
      throw new Error(
        'Invalid server configuration: SESSION_SECRET: SESSION_SECRET is required in production',
      );
    }
    if (effectiveSecret.length < 32) {
      throw new Error(
        'Invalid server configuration: SESSION_SECRET: SESSION_SECRET must be at least 32 characters in production',
      );
    }
    if (effectiveSecret === DEV_SESSION_SECRET || effectiveSecret === TEST_SESSION_SECRET) {
      throw new Error(
        'Invalid server configuration: SESSION_SECRET: SESSION_SECRET cannot use development or test defaults in production',
      );
    }
    sessionSecret = effectiveSecret;
  } else if (NODE_ENV === 'test') {
    if (effectiveSecret) {
      if (effectiveSecret.length < 32) {
        throw new Error(
          'Invalid server configuration: SESSION_SECRET: SESSION_SECRET must be at least 32 characters if specified',
        );
      }
      sessionSecret = effectiveSecret;
    } else {
      sessionSecret = TEST_SESSION_SECRET;
    }
  } else {
    // development
    if (effectiveSecret) {
      if (effectiveSecret.length < 32) {
        throw new Error(
          'Invalid server configuration: SESSION_SECRET: SESSION_SECRET must be at least 32 characters if specified',
        );
      }
      sessionSecret = effectiveSecret;
    } else {
      sessionSecret = DEV_SESSION_SECRET;
    }
  }

  return {
    databaseUrl: DATABASE_URL,
    databaseDirectUrl: DATABASE_DIRECT_URL,
    databasePoolMax: DB_POOL_MAX,
    dbSsl: DB_SSL,
    host: HOST,
    logLevel: LOG_LEVEL,
    nodeEnv: NODE_ENV,
    port: PORT,
    sessionSecret,
    sessionTtlHours: SESSION_TTL_HOURS,
  };
}

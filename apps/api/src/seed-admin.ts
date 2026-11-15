import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase, provisionAdminUser } from '@palnadu/persistence';
import { parseServerConfig } from '@palnadu/server-config';

export interface SeedAdminOptions {
  env?: Record<string, string | undefined>;
  argv?: string[];
}

function parseSeedEnvironment(
  optionsOrEnv: SeedAdminOptions | Record<string, string | undefined>,
): { env: Record<string, string | undefined>; argv: string[]; isExplicit: boolean } {
  const isOptionsObject = Boolean(
    optionsOrEnv && ('env' in optionsOrEnv || 'argv' in optionsOrEnv),
  );
  if (isOptionsObject) {
    const opts = optionsOrEnv as SeedAdminOptions;
    return {
      env: opts.env ?? process.env,
      argv: opts.argv ?? [],
      isExplicit: Boolean(opts.env),
    };
  }

  const rawEnv = optionsOrEnv as Record<string, string | undefined>;
  const hasKeys = Object.keys(rawEnv).length > 0;
  return {
    env: hasKeys ? rawEnv : process.env,
    argv: hasKeys ? [] : process.argv.slice(2),
    isExplicit: hasKeys,
  };
}

function loadLocalEnvFile(): void {
  const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
}

export async function seedAdmin(
  optionsOrEnv: SeedAdminOptions | Record<string, string | undefined> = {},
) {
  const { env, argv, isExplicit } = parseSeedEnvironment(optionsOrEnv);
  if (!isExplicit) {
    loadLocalEnvFile();
  }

  const email = env.ADMIN_EMAIL || argv[0];
  const name = env.ADMIN_NAME || argv[1];
  const password = env.ADMIN_PASSWORD || argv[2];

  if (!email || !name || !password) {
    throw new Error(
      'Administrator provisioning requires ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD (min 8 characters).',
    );
  }

  const config = parseServerConfig(env);
  const database = createDatabase(config);

  try {
    return await provisionAdminUser(database.db, {
      email,
      name,
      password,
      permissions: ['catalogue:manage', 'pricing:manage', 'admin:manage'],
    });
  } finally {
    await database.close();
  }
}

const scriptPath = process.argv[1] === undefined ? '' : resolve(process.argv[1]);
if (scriptPath === fileURLToPath(import.meta.url)) {
  try {
    const user = await seedAdmin();
    console.info(`Admin user provisioned successfully: ${user.email} (${user.id})`);
  } catch (error) {
    console.error(`Provisioning failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

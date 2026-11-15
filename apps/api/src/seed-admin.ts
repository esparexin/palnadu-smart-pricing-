import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase, provisionAdminUser } from '@palnadu/persistence';
import { parseServerConfig } from '@palnadu/server-config';

export interface SeedAdminOptions {
  env?: Record<string, string | undefined>;
  argv?: string[];
}

export async function seedAdmin(
  optionsOrEnv: SeedAdminOptions | Record<string, string | undefined> = {},
) {
  const isOptionsObject = optionsOrEnv && ('env' in optionsOrEnv || 'argv' in optionsOrEnv);
  const explicitEnv = isOptionsObject
    ? (optionsOrEnv as SeedAdminOptions).env
    : Object.keys(optionsOrEnv).length > 0
      ? (optionsOrEnv as Record<string, string | undefined>)
      : undefined;

  const env = explicitEnv ?? process.env;
  const argv = isOptionsObject
    ? ((optionsOrEnv as SeedAdminOptions).argv ?? [])
    : explicitEnv
      ? []
      : process.argv.slice(2);

  if (!explicitEnv) {
    const envFile = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env');
    if (existsSync(envFile)) {
      process.loadEnvFile(envFile);
    }
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
    const user = await provisionAdminUser(database.db, {
      email,
      name,
      password,
      permissions: ['catalogue:manage', 'pricing:manage', 'admin:manage'],
    });

    return user;
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

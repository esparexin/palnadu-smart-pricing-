import { describe, expect, it } from 'vitest';
import { seedAdmin } from './seed-admin.js';

describe('Administrator Provisioning CLI (seed-admin)', () => {
  it('rejects provisioning when required inputs are missing', async () => {
    await expect(seedAdmin({})).rejects.toThrow(
      'Administrator provisioning requires ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD',
    );
    await expect(seedAdmin({ ADMIN_EMAIL: 'admin@example.com' })).rejects.toThrow(
      'Administrator provisioning requires ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD',
    );
    await expect(
      seedAdmin({ ADMIN_EMAIL: 'admin@example.com', ADMIN_NAME: 'Admin' }),
    ).rejects.toThrow(
      'Administrator provisioning requires ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD',
    );
    await expect(seedAdmin({ argv: ['admin@example.com', 'Admin'] })).rejects.toThrow(
      'Administrator provisioning requires ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD',
    );
  });
});

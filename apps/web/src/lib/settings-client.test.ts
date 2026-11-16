import { describe, expect, it, vi } from 'vitest';
import { SettingsClient } from './settings-client.js';
import type { RequestExecutor } from './catalogue-client.js';

describe('SettingsClient', () => {
  const mockExecutor: RequestExecutor = {
    request: vi.fn().mockResolvedValue({}),
  };
  const client = new SettingsClient(mockExecutor);

  it('calls getCompanyProfile with GET', async () => {
    await client.getCompanyProfile();
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/settings/company');
  });

  it('calls updateCompanyProfile with PUT payload', async () => {
    const payload = {
      companyName: 'Palnadu Corp',
      gstin: '37AAAAA0000A1Z5',
    };
    await client.updateCompanyProfile(payload);
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/settings/company', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  });
});

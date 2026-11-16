import { describe, expect, it, vi } from 'vitest';
import { IntegrationsClient, type RequestExecutor } from './integrations-client';

describe('IntegrationsClient', () => {
  const mockExecutor: RequestExecutor = {
    request: vi.fn(),
  };
  const client = new IntegrationsClient(mockExecutor);

  it('calls listConnectors correctly', async () => {
    vi.mocked(mockExecutor.request).mockResolvedValueOnce([]);
    const res = await client.listConnectors();
    expect(res).toEqual([]);
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/integrations/connectors');
  });

  it('calls createConnector correctly', async () => {
    const payload = {
      provider: 'tally_prime' as const,
      name: 'Tally Head Office',
    };
    vi.mocked(mockExecutor.request).mockResolvedValueOnce({ id: 'conn-1', ...payload });
    const res = await client.createConnector(payload as never);
    expect(res.id).toBe('conn-1');
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/integrations/connectors',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('calls triggerSync correctly', async () => {
    vi.mocked(mockExecutor.request).mockResolvedValueOnce({ id: 'job-1', status: 'completed' });
    const res = await client.triggerSync('conn-1', { jobType: 'inventory' });
    expect(res.id).toBe('job-1');
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/integrations/connectors/conn-1/sync',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});

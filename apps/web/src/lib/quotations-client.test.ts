import { describe, expect, it, vi } from 'vitest';
import { QuotationsClient } from './quotations-client.js';
import type { RequestExecutor } from './catalogue-client.js';

describe('QuotationsClient', () => {
  const mockExecutor: RequestExecutor = {
    request: vi.fn().mockResolvedValue({}),
  };
  const client = new QuotationsClient(mockExecutor);

  it('calls listQuotations with query params', async () => {
    await client.listQuotations({ status: 'submitted', q: 'Acme', limit: 20, offset: 0 });
    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/quotations?status=submitted&q=Acme&limit=20&offset=0',
    );
  });

  it('calls getQuotationById with encoded id', async () => {
    await client.getQuotationById('quote-123');
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/quotations/quote-123');
  });

  it('calls updateQuotationStatus with PATCH payload', async () => {
    await client.updateQuotationStatus('quote-123', 'issued');
    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/quotations/quote-123/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'issued' }),
    });
  });
});

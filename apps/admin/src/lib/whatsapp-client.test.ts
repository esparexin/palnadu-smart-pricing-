import { describe, expect, it, vi } from 'vitest';
import { WhatsAppClient } from './whatsapp-client.js';

describe('WhatsAppClient', () => {
  it('calls getConfig correctly', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        id: 'default',
        enabled: true,
        phoneNumberId: '12345',
      }),
    };
    const client = new WhatsAppClient(mockExecutor);
    const result = await client.getConfig();

    expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/whatsapp/config');
    expect(result.enabled).toBe(true);
  });

  it('calls updateConfig correctly', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        id: 'default',
        enabled: true,
      }),
    };
    const client = new WhatsAppClient(mockExecutor);
    await client.updateConfig({ enabled: true, phoneNumberId: '998877' });

    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/whatsapp/config',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ enabled: true, phoneNumberId: '998877' }),
      }),
    );
  });

  it('calls sendMessage correctly', async () => {
    const mockExecutor = {
      request: vi.fn().mockResolvedValue({
        success: true,
        wamid: 'wamid.123',
        status: 'sent',
      }),
    };
    const client = new WhatsAppClient(mockExecutor);
    const result = await client.sendMessage({
      to: '+919988776655',
      type: 'text',
      text: 'Quotation details',
    });

    expect(mockExecutor.request).toHaveBeenCalledWith(
      '/api/v1/admin/whatsapp/messages',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result.wamid).toBe('wamid.123');
  });
});

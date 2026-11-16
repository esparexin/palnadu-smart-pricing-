import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CreateErpConnectorRequestSchema,
  ErpConnectorConfigSchema,
  ErpSyncJobSchema,
  TriggerSyncRequestSchema,
} from './integrations.js';

describe('Integrations Contracts', () => {
  it('validates a complete ErpConnectorConfig', () => {
    const config = {
      id: randomUUID(),
      provider: 'tally_prime' as const,
      name: 'Local Godown Tally Gateway',
      enabled: true,
      endpointUrl: 'http://127.0.0.1:9000',
      productSsot: 'external_erp' as const,
      inventorySsot: 'external_erp' as const,
      priceSsot: 'palnadu_smart_pricing' as const,
      fieldMappings: { ItemName: 'name', StockQty: 'quantity' },
      hasAuthSecret: true,
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'success' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsed = ErpConnectorConfigSchema.parse(config);
    expect(parsed.provider).toBe('tally_prime');
    expect(parsed.inventorySsot).toBe('external_erp');
  });

  it('validates CreateErpConnectorRequest with defaults', () => {
    const req = {
      provider: 'generic_webhook' as const,
      name: 'SAP Webhook Connector',
    };
    const parsed = CreateErpConnectorRequestSchema.parse(req);
    expect(parsed.enabled).toBe(false);
    expect(parsed.productSsot).toBe('palnadu_smart_pricing');
    expect(parsed.inventorySsot).toBe('palnadu_smart_pricing');
  });

  it('validates ErpSyncJob', () => {
    const job = {
      id: randomUUID(),
      connectorId: randomUUID(),
      jobType: 'inventory' as const,
      status: 'completed' as const,
      itemsProcessed: 150,
      itemsCreated: 0,
      itemsUpdated: 148,
      itemsFailed: 2,
      startedAt: new Date().toISOString(),
    };
    const parsed = ErpSyncJobSchema.parse(job);
    expect(parsed.itemsProcessed).toBe(150);
    expect(parsed.status).toBe('completed');
  });

  it('validates TriggerSyncRequest', () => {
    const trigger = {
      jobType: 'products' as const,
      payloadData: '<ENVELOPE>...</ENVELOPE>',
    };
    const parsed = TriggerSyncRequestSchema.parse(trigger);
    expect(parsed.jobType).toBe('products');
  });
});

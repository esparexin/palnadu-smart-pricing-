import type {
  CreateStockMovementRequest,
  InventoryAlertResponse,
  InventoryBalanceResponse,
  InventoryConfig,
  InventoryMovementResponse,
  UpdateInventoryConfigRequest,
} from '@palnadu/contracts';

export interface RequestExecutor {
  request<T>(endpoint: string, init?: RequestInit): Promise<T>;
}

export class InventoryClient {
  private readonly executor: RequestExecutor;

  constructor(executor: RequestExecutor) {
    this.executor = executor;
  }

  public getConfig(): Promise<InventoryConfig> {
    return this.executor.request<InventoryConfig>('/api/v1/admin/inventory/config');
  }

  public updateConfig(updates: UpdateInventoryConfigRequest): Promise<InventoryConfig> {
    return this.executor.request<InventoryConfig>('/api/v1/admin/inventory/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  public listBalances(params?: {
    limit?: number;
    offset?: number;
  }): Promise<InventoryBalanceResponse[]> {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return this.executor.request<InventoryBalanceResponse[]>(
      `/api/v1/admin/inventory/balances${qs ? `?${qs}` : ''}`,
    );
  }

  public recordMovement(
    request: CreateStockMovementRequest,
  ): Promise<{ movement: unknown; balance: unknown; stockStatus: string }> {
    return this.executor.request('/api/v1/admin/inventory/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  public listMovements(params?: {
    variantId?: string;
    limit?: number;
    offset?: number;
  }): Promise<InventoryMovementResponse[]> {
    const search = new URLSearchParams();
    if (params?.variantId) search.set('variantId', params.variantId);
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return this.executor.request<InventoryMovementResponse[]>(
      `/api/v1/admin/inventory/movements${qs ? `?${qs}` : ''}`,
    );
  }

  public listAlerts(params?: {
    state?: 'active' | 'cleared' | 'acknowledged';
    limit?: number;
  }): Promise<InventoryAlertResponse[]> {
    const search = new URLSearchParams();
    if (params?.state) search.set('state', params.state);
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return this.executor.request<InventoryAlertResponse[]>(
      `/api/v1/admin/inventory/alerts${qs ? `?${qs}` : ''}`,
    );
  }

  public acknowledgeAlert(alertId: string): Promise<{ success: boolean }> {
    return this.executor.request<{ success: boolean }>(
      `/api/v1/admin/inventory/alerts/${alertId}/acknowledge`,
      { method: 'POST' },
    );
  }
}

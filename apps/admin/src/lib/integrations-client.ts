import type {
  CreateErpConnectorRequest,
  ErpConnectorConfig,
  ErpSyncJob,
  TriggerSyncRequest,
  UpdateErpConnectorRequest,
} from '@palnadu/contracts';

export interface RequestExecutor {
  request<T>(endpoint: string, init?: RequestInit): Promise<T>;
}

export class IntegrationsClient {
  private readonly executor: RequestExecutor;

  constructor(executor: RequestExecutor) {
    this.executor = executor;
  }

  public listConnectors(): Promise<ErpConnectorConfig[]> {
    return this.executor.request<ErpConnectorConfig[]>('/api/v1/admin/integrations/connectors');
  }

  public getConnector(id: string): Promise<ErpConnectorConfig> {
    return this.executor.request<ErpConnectorConfig>(`/api/v1/admin/integrations/connectors/${id}`);
  }

  public createConnector(req: CreateErpConnectorRequest): Promise<ErpConnectorConfig> {
    return this.executor.request<ErpConnectorConfig>('/api/v1/admin/integrations/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  }

  public updateConnector(id: string, req: UpdateErpConnectorRequest): Promise<ErpConnectorConfig> {
    return this.executor.request<ErpConnectorConfig>(
      `/api/v1/admin/integrations/connectors/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      },
    );
  }

  public deleteConnector(id: string): Promise<void> {
    return this.executor.request<void>(`/api/v1/admin/integrations/connectors/${id}`, {
      method: 'DELETE',
    });
  }

  public listSyncJobs(connectorId: string, limit?: number): Promise<ErpSyncJob[]> {
    const qs = limit ? `?limit=${limit}` : '';
    return this.executor.request<ErpSyncJob[]>(
      `/api/v1/admin/integrations/connectors/${connectorId}/jobs${qs}`,
    );
  }

  public triggerSync(connectorId: string, req: TriggerSyncRequest): Promise<ErpSyncJob> {
    return this.executor.request<ErpSyncJob>(
      `/api/v1/admin/integrations/connectors/${connectorId}/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      },
    );
  }
}

import type {
  SendWhatsAppMessageRequest,
  UpdateWhatsAppConfigRequest,
  WhatsAppConfig,
  WhatsAppMessageListItem,
  WhatsAppOptOutListItem,
} from '@palnadu/contracts';

export interface RequestExecutor {
  request<T>(endpoint: string, init?: RequestInit): Promise<T>;
}

export class WhatsAppClient {
  private readonly executor: RequestExecutor;

  constructor(executor: RequestExecutor) {
    this.executor = executor;
  }

  public getConfig(): Promise<WhatsAppConfig> {
    return this.executor.request<WhatsAppConfig>('/api/v1/admin/whatsapp/config');
  }

  public updateConfig(updates: UpdateWhatsAppConfigRequest): Promise<WhatsAppConfig> {
    return this.executor.request<WhatsAppConfig>('/api/v1/admin/whatsapp/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  public listMessages(params?: {
    limit?: number;
    offset?: number;
  }): Promise<WhatsAppMessageListItem[]> {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.offset) search.set('offset', String(params.offset));
    const qs = search.toString();
    return this.executor.request<WhatsAppMessageListItem[]>(
      `/api/v1/admin/whatsapp/messages${qs ? `?${qs}` : ''}`,
    );
  }

  public listOptOuts(): Promise<WhatsAppOptOutListItem[]> {
    return this.executor.request<WhatsAppOptOutListItem[]>('/api/v1/admin/whatsapp/opt-outs');
  }

  public sendMessage(
    request: SendWhatsAppMessageRequest,
  ): Promise<{ success: boolean; wamid: string; status: string }> {
    return this.executor.request('/api/v1/admin/whatsapp/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }
}

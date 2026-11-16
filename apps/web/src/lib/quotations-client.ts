import type {
  AdminQuotationDetail,
  AdminQuotationListQuery,
  AdminQuotationListResponse,
  QuotationStatus,
} from '@palnadu/contracts';
import type { RequestExecutor } from './catalogue-client.js';

function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export class QuotationsClient {
  constructor(private readonly executor: RequestExecutor) {}

  public listQuotations(query?: AdminQuotationListQuery): Promise<AdminQuotationListResponse> {
    return this.executor.request<AdminQuotationListResponse>(
      `/api/v1/admin/quotations${buildQuery(query as Record<string, unknown>)}`,
    );
  }

  public getQuotationById(id: string): Promise<AdminQuotationDetail> {
    return this.executor.request<AdminQuotationDetail>(
      `/api/v1/admin/quotations/${encodeURIComponent(id)}`,
    );
  }

  public updateQuotationStatus(id: string, status: QuotationStatus): Promise<AdminQuotationDetail> {
    return this.executor.request<AdminQuotationDetail>(
      `/api/v1/admin/quotations/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      },
    );
  }
}

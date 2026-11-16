import type { ApiErrorResponse, HealthResponse, ReadinessResponse } from '@palnadu/contracts';
import { StorefrontClient } from './storefront-client';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;

  constructor(status: number, message: string, code = 'API_ERROR', requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
}

function buildHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  if (init?.body && !headers.has('Content-Type') && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function handleError(response: Response, payload: unknown): never {
  const err = payload as ApiErrorResponse | null;
  const code = err?.error?.code ?? 'HTTP_ERROR';
  const message = err?.error?.message ?? `Request failed with status code ${response.status}`;
  const requestId = err?.error?.requestId;
  throw new ApiClientError(response.status, message, code, requestId);
}

export class ApiClient {
  private readonly baseUrl: string;
  public readonly storefront: StorefrontClient;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? (process.env.NEXT_PUBLIC_API_URL || '');
    this.storefront = new StorefrontClient(this);
  }

  public async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = buildHeaders(init);

    const response = await fetch(url, {
      ...init,
      headers,
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      handleError(response, payload);
    }

    return payload as T;
  }

  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/v1/health');
  }

  public async getReadiness(): Promise<ReadinessResponse> {
    return this.request<ReadinessResponse>('/api/v1/ready');
  }
}

export const apiClient = new ApiClient();

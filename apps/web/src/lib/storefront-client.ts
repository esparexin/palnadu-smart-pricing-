import type {
  BrandResponse,
  CategoryResponse,
  PublicProductDto,
  PublicProductListResponse,
  PublicProductQuery,
  PublicRecommendationListResponse,
} from '@palnadu/contracts';

export interface RequestExecutor {
  request<T>(endpoint: string, init?: RequestInit): Promise<T>;
}

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

export class StorefrontClient {
  constructor(private readonly executor: RequestExecutor) {}

  public listProducts(params?: Partial<PublicProductQuery>): Promise<PublicProductListResponse> {
    return this.executor.request<PublicProductListResponse>(
      `/api/v1/public/products${buildQuery(params as Record<string, unknown>)}`,
    );
  }

  public getProductBySlug(slug: string): Promise<PublicProductDto> {
    return this.executor.request<PublicProductDto>(
      `/api/v1/public/products/${encodeURIComponent(slug)}`,
    );
  }

  public listCategories(q?: string): Promise<CategoryResponse[]> {
    return this.executor.request<CategoryResponse[]>(
      `/api/v1/public/categories${buildQuery({ q })}`,
    );
  }

  public listBrands(q?: string): Promise<BrandResponse[]> {
    return this.executor.request<BrandResponse[]>(`/api/v1/public/brands${buildQuery({ q })}`);
  }

  public getRecommendations(productId: string): Promise<PublicRecommendationListResponse> {
    return this.executor.request<PublicRecommendationListResponse>(
      `/api/v1/public/products/${encodeURIComponent(productId)}/recommendations`,
    );
  }
}

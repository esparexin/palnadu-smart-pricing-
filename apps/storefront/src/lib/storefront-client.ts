import type {
  BrandResponse,
  CategoryResponse,
  CustomerEnquiryCreate,
  CustomerEnquiryResponse,
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
  private categoriesCache: { data: CategoryResponse[]; timestamp: number; key: string } | null =
    null;
  private pendingCategories = new Map<string, Promise<CategoryResponse[]>>();

  private brandsCache: { data: BrandResponse[]; timestamp: number; key: string } | null = null;
  private pendingBrands = new Map<string, Promise<BrandResponse[]>>();

  private productsCache = new Map<string, { data: PublicProductListResponse; timestamp: number }>();
  private pendingProducts = new Map<string, Promise<PublicProductListResponse>>();

  private productBySlugCache = new Map<string, { data: PublicProductDto; timestamp: number }>();
  private pendingProductBySlug = new Map<string, Promise<PublicProductDto>>();

  constructor(private readonly executor: RequestExecutor) {}

  public clearCache(): void {
    this.categoriesCache = null;
    this.pendingCategories.clear();
    this.brandsCache = null;
    this.pendingBrands.clear();
    this.productsCache.clear();
    this.pendingProducts.clear();
    this.productBySlugCache.clear();
    this.pendingProductBySlug.clear();
  }

  public async listProducts(
    params?: Partial<PublicProductQuery>,
  ): Promise<PublicProductListResponse> {
    const qs = buildQuery(params as Record<string, unknown>);
    const key = qs || '__all__';
    const now = Date.now();
    const cached = this.productsCache.get(key);
    if (cached && now - cached.timestamp < 30_000) {
      return cached.data;
    }

    const pending = this.pendingProducts.get(key);
    if (pending) {
      return pending;
    }

    const promise = this.executor
      .request<PublicProductListResponse>(`/api/v1/public/products${qs}`)
      .then((data) => {
        this.productsCache.set(key, { data, timestamp: Date.now() });
        this.pendingProducts.delete(key);
        return data;
      })
      .catch((err) => {
        this.pendingProducts.delete(key);
        throw err;
      });

    this.pendingProducts.set(key, promise);
    return promise;
  }

  public async getProductBySlug(slug: string): Promise<PublicProductDto> {
    const key = slug.trim().toLowerCase();
    const now = Date.now();
    const cached = this.productBySlugCache.get(key);
    if (cached && now - cached.timestamp < 30_000) {
      return cached.data;
    }

    const pending = this.pendingProductBySlug.get(key);
    if (pending) {
      return pending;
    }

    const promise = this.executor
      .request<PublicProductDto>(`/api/v1/public/products/${encodeURIComponent(slug)}`)
      .then((data) => {
        this.productBySlugCache.set(key, { data, timestamp: Date.now() });
        this.pendingProductBySlug.delete(key);
        return data;
      })
      .catch((err) => {
        this.pendingProductBySlug.delete(key);
        throw err;
      });

    this.pendingProductBySlug.set(key, promise);
    return promise;
  }

  public async listCategories(q?: string): Promise<CategoryResponse[]> {
    const key = q?.trim() || '';
    const now = Date.now();
    if (
      this.categoriesCache &&
      this.categoriesCache.key === key &&
      now - this.categoriesCache.timestamp < 60_000
    ) {
      return this.categoriesCache.data;
    }

    const pending = this.pendingCategories.get(key);
    if (pending) {
      return pending;
    }

    const promise = this.executor
      .request<CategoryResponse[]>(`/api/v1/public/categories${buildQuery({ q })}`)
      .then((data) => {
        this.categoriesCache = { data, timestamp: Date.now(), key };
        this.pendingCategories.delete(key);
        return data;
      })
      .catch((err) => {
        this.pendingCategories.delete(key);
        throw err;
      });

    this.pendingCategories.set(key, promise);
    return promise;
  }

  public async listBrands(q?: string): Promise<BrandResponse[]> {
    const key = q?.trim() || '';
    const now = Date.now();
    if (
      this.brandsCache &&
      this.brandsCache.key === key &&
      now - this.brandsCache.timestamp < 60_000
    ) {
      return this.brandsCache.data;
    }

    const pending = this.pendingBrands.get(key);
    if (pending) {
      return pending;
    }

    const promise = this.executor
      .request<BrandResponse[]>(`/api/v1/public/brands${buildQuery({ q })}`)
      .then((data) => {
        this.brandsCache = { data, timestamp: Date.now(), key };
        this.pendingBrands.delete(key);
        return data;
      })
      .catch((err) => {
        this.pendingBrands.delete(key);
        throw err;
      });

    this.pendingBrands.set(key, promise);
    return promise;
  }

  public getRecommendations(productId: string): Promise<PublicRecommendationListResponse> {
    return this.executor.request<PublicRecommendationListResponse>(
      `/api/v1/public/products/${encodeURIComponent(productId)}/recommendations`,
    );
  }

  public submitEnquiry(data: CustomerEnquiryCreate): Promise<CustomerEnquiryResponse> {
    return this.executor.request<CustomerEnquiryResponse>('/api/v1/public/enquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

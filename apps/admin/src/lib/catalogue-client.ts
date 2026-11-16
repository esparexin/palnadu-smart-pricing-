import type {
  AdminBrandCreate,
  AdminBrandUpdate,
  AdminCategoryCreate,
  AdminCategoryUpdate,
  AdminImageCreate,
  AdminImageUpdate,
  AdminProductCreate,
  AdminProductDetailResponse,
  AdminProductListResponse,
  AdminProductUpdate,
  AdminRelationshipCreate,
  AdminVariantCreate,
  AdminVariantUpdate,
  BrandListResponse,
  BrandResponse,
  CategoryListQuery,
  CategoryListResponse,
  CategoryResponse,
  ImageResponse,
  PaginationQuery,
  ProductListQuery,
  RelationshipResponse,
  SuccessResponse,
  VariantResponse,
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

export class CatalogueClient {
  constructor(private readonly executor: RequestExecutor) {}

  // Brands
  public listBrands(params?: Partial<PaginationQuery>): Promise<BrandListResponse> {
    return this.executor.request<BrandListResponse>(
      `/api/v1/admin/brands${buildQuery(params as Record<string, unknown>)}`,
    );
  }

  public getBrand(id: string): Promise<BrandResponse> {
    return this.executor.request<BrandResponse>(`/api/v1/admin/brands/${id}`);
  }

  public createBrand(data: AdminBrandCreate): Promise<BrandResponse> {
    return this.executor.request<BrandResponse>('/api/v1/admin/brands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateBrand(id: string, data: AdminBrandUpdate): Promise<BrandResponse> {
    return this.executor.request<BrandResponse>(`/api/v1/admin/brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public deleteBrand(id: string): Promise<SuccessResponse> {
    return this.executor.request<SuccessResponse>(`/api/v1/admin/brands/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  public listCategories(params?: Partial<CategoryListQuery>): Promise<CategoryListResponse> {
    return this.executor.request<CategoryListResponse>(
      `/api/v1/admin/categories${buildQuery(params as Record<string, unknown>)}`,
    );
  }

  public getCategory(id: string): Promise<CategoryResponse> {
    return this.executor.request<CategoryResponse>(`/api/v1/admin/categories/${id}`);
  }

  public createCategory(data: AdminCategoryCreate): Promise<CategoryResponse> {
    return this.executor.request<CategoryResponse>('/api/v1/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateCategory(id: string, data: AdminCategoryUpdate): Promise<CategoryResponse> {
    return this.executor.request<CategoryResponse>(`/api/v1/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public deleteCategory(id: string): Promise<SuccessResponse> {
    return this.executor.request<SuccessResponse>(`/api/v1/admin/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Products
  public listProducts(params?: Partial<ProductListQuery>): Promise<AdminProductListResponse> {
    return this.executor.request<AdminProductListResponse>(
      `/api/v1/admin/products${buildQuery(params as Record<string, unknown>)}`,
    );
  }

  public getProduct(id: string): Promise<AdminProductDetailResponse> {
    return this.executor.request<AdminProductDetailResponse>(`/api/v1/admin/products/${id}`);
  }

  public createProduct(data: AdminProductCreate): Promise<AdminProductDetailResponse> {
    return this.executor.request<AdminProductDetailResponse>('/api/v1/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateProduct(id: string, data: AdminProductUpdate): Promise<AdminProductDetailResponse> {
    return this.executor.request<AdminProductDetailResponse>(`/api/v1/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  public deleteProduct(id: string): Promise<SuccessResponse> {
    return this.executor.request<SuccessResponse>(`/api/v1/admin/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Variants
  public listVariants(productId: string): Promise<VariantResponse[]> {
    return this.executor.request<VariantResponse[]>(`/api/v1/admin/products/${productId}/variants`);
  }

  public createVariant(productId: string, data: AdminVariantCreate): Promise<VariantResponse> {
    return this.executor.request<VariantResponse>(`/api/v1/admin/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateVariant(
    productId: string,
    id: string,
    data: AdminVariantUpdate,
  ): Promise<VariantResponse> {
    return this.executor.request<VariantResponse>(
      `/api/v1/admin/products/${productId}/variants/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }

  public deleteVariant(productId: string, id: string): Promise<SuccessResponse> {
    return this.executor.request<SuccessResponse>(
      `/api/v1/admin/products/${productId}/variants/${id}`,
      {
        method: 'DELETE',
      },
    );
  }

  // Images
  public listImages(productId: string): Promise<ImageResponse[]> {
    return this.executor.request<ImageResponse[]>(`/api/v1/admin/products/${productId}/images`);
  }

  public createImage(productId: string, data: AdminImageCreate): Promise<ImageResponse> {
    return this.executor.request<ImageResponse>(`/api/v1/admin/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateImage(
    productId: string,
    id: string,
    data: AdminImageUpdate,
  ): Promise<ImageResponse> {
    return this.executor.request<ImageResponse>(
      `/api/v1/admin/products/${productId}/images/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }

  public deleteImage(productId: string, id: string): Promise<SuccessResponse> {
    return this.executor.request<SuccessResponse>(
      `/api/v1/admin/products/${productId}/images/${id}`,
      {
        method: 'DELETE',
      },
    );
  }

  // Relationships
  public listRelationships(productId: string): Promise<RelationshipResponse[]> {
    return this.executor.request<RelationshipResponse[]>(
      `/api/v1/admin/products/${productId}/relationships`,
    );
  }

  public createRelationship(
    productId: string,
    data: AdminRelationshipCreate,
  ): Promise<RelationshipResponse> {
    return this.executor.request<RelationshipResponse>(
      `/api/v1/admin/products/${productId}/relationships`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  public deleteRelationship(productId: string, id: string): Promise<SuccessResponse> {
    return this.executor.request<SuccessResponse>(
      `/api/v1/admin/products/${productId}/relationships/${id}`,
      {
        method: 'DELETE',
      },
    );
  }
}

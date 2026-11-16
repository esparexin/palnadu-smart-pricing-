import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueClient, type RequestExecutor } from './catalogue-client';

describe('CatalogueClient', () => {
  let mockExecutor: RequestExecutor;
  let client: CatalogueClient;

  beforeEach(() => {
    mockExecutor = {
      request: vi.fn().mockResolvedValue({}),
    };
    client = new CatalogueClient(mockExecutor);
  });

  describe('Brands', () => {
    it('calls listBrands with query parameters', async () => {
      await client.listBrands({ limit: 10, offset: 0, q: 'hikvision' });
      expect(mockExecutor.request).toHaveBeenCalledWith(
        '/api/v1/admin/brands?limit=10&offset=0&q=hikvision',
      );
    });

    it('calls getBrand by ID', async () => {
      await client.getBrand('brand-1');
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/brands/brand-1');
    });

    it('calls createBrand with POST payload', async () => {
      const data = { name: 'Hikvision', slug: 'hikvision' };
      await client.createBrand(data);
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/brands', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('calls updateBrand with PATCH payload', async () => {
      const data = { name: 'Hikvision Updated' };
      await client.updateBrand('brand-1', data);
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/brands/brand-1', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    });

    it('calls deleteBrand with DELETE', async () => {
      await client.deleteBrand('brand-1');
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/brands/brand-1', {
        method: 'DELETE',
      });
    });
  });

  describe('Categories', () => {
    it('calls listCategories with parentId query', async () => {
      await client.listCategories({ parentId: 'cat-parent-1' });
      expect(mockExecutor.request).toHaveBeenCalledWith(
        '/api/v1/admin/categories?parentId=cat-parent-1',
      );
    });

    it('calls createCategory with parentId', async () => {
      const data = { name: 'IP Cameras', slug: 'ip-cameras', parentId: 'cat-1' };
      await client.createCategory(data);
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('calls updateCategory and deleteCategory', async () => {
      await client.updateCategory('cat-1', { name: 'Network Cameras' });
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/categories/cat-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Network Cameras' }),
      });

      await client.deleteCategory('cat-1');
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/categories/cat-1', {
        method: 'DELETE',
      });
    });
  });

  describe('Products', () => {
    it('calls listProducts with filters', async () => {
      await client.listProducts({ status: 'published', limit: 20 });
      expect(mockExecutor.request).toHaveBeenCalledWith(
        '/api/v1/admin/products?status=published&limit=20',
      );
    });

    it('calls getProduct by ID', async () => {
      await client.getProduct('prod-1');
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/products/prod-1');
    });

    it('calls createProduct with master data', async () => {
      const data = {
        name: '4MP Dome Camera',
        slug: '4mp-dome-camera',
        unit: 'piece',
        mrpPaise: 500000,
        offerPricePaise: 450000,
        discountType: 'none' as const,
        discountValue: 0,
        categoryIds: [],
        specifications: {},
        status: 'draft' as const,
        variants: [],
        images: [],
      };
      await client.createProduct(data);
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });

    it('calls deleteProduct', async () => {
      await client.deleteProduct('prod-1');
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/products/prod-1', {
        method: 'DELETE',
      });
    });
  });

  describe('Variants, Images, Relationships', () => {
    it('handles variant operations', async () => {
      await client.listVariants('prod-1');
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/products/prod-1/variants');

      await client.createVariant('prod-1', { sku: 'SKU-001', options: {} });
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/products/prod-1/variants', {
        method: 'POST',
        body: JSON.stringify({ sku: 'SKU-001', options: {} }),
      });
    });

    it('handles image operations', async () => {
      await client.listImages('prod-1');
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/products/prod-1/images');

      const imgData = {
        url: 'https://example.com/cam.jpg',
        altText: 'Camera Front',
        sortOrder: 1,
        isPrimary: true,
        rightsStatus: 'manual_upload' as const,
      };
      await client.createImage('prod-1', imgData);
      expect(mockExecutor.request).toHaveBeenCalledWith('/api/v1/admin/products/prod-1/images', {
        method: 'POST',
        body: JSON.stringify(imgData),
      });
    });

    it('handles relationship operations', async () => {
      await client.listRelationships('prod-1');
      expect(mockExecutor.request).toHaveBeenCalledWith(
        '/api/v1/admin/products/prod-1/relationships',
      );

      const relData = {
        targetProductId: 'prod-2',
        relationshipType: 'compatible' as const,
        confirmedByAdmin: true,
        notes: 'Compatible bracket',
      };
      await client.createRelationship('prod-1', relData);
      expect(mockExecutor.request).toHaveBeenCalledWith(
        '/api/v1/admin/products/prod-1/relationships',
        {
          method: 'POST',
          body: JSON.stringify(relData),
        },
      );
    });
  });
});

import { eq, inArray } from 'drizzle-orm';
import { PublicProductDto, PublicProductDtoSchema } from '@palnadu/contracts';
import type { DbExecutor } from './client.js';
import {
  brands,
  categories,
  productCategories,
  productImages,
  products,
  productVariants,
} from './schema.js';

export function mapToPublicProductDto(
  product: typeof products.$inferSelect,
  brand: { id: string; name: string; slug: string } | null,
  categoriesList: Array<{ id: string; name: string; slug: string }>,
  variantsList: Array<typeof productVariants.$inferSelect>,
  imagesList: Array<typeof productImages.$inferSelect>,
): PublicProductDto {
  return PublicProductDtoSchema.parse({
    id: product.id,
    slug: product.slug,
    name: product.name,
    model: product.model ?? null,
    description: product.description ?? null,
    unit: product.unit,
    specifications: product.specifications ?? {},
    brand: brand ? { id: brand.id, name: brand.name, slug: brand.slug } : null,
    categories: categoriesList.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    variants: variantsList.map((v) => ({
      id: v.id,
      sku: v.sku ?? null,
      model: v.model ?? null,
      options: v.options ?? {},
    })),
    images: imagesList.map((img) => ({
      url: img.url,
      altText: img.altText ?? '',
      isPrimary: img.isPrimary,
    })),
  });
}

export async function hydratePublicProducts(
  db: DbExecutor,
  productRows: Array<typeof products.$inferSelect>,
): Promise<PublicProductDto[]> {
  if (productRows.length === 0) return [];

  const productIds = productRows.map((p) => p.id);
  const brandIds = [...new Set(productRows.map((p) => p.brandId).filter(Boolean))] as string[];

  const [brandRows, catRows, variantRows, imageRows] = await Promise.all([
    brandIds.length > 0
      ? db.select().from(brands).where(inArray(brands.id, brandIds))
      : Promise.resolve([]),
    db
      .select({
        productId: productCategories.productId,
        category: categories,
      })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(inArray(productCategories.productId, productIds)),
    db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds))
      .orderBy(productVariants.createdAt),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.sortOrder),
  ]);

  const brandMap = new Map(brandRows.map((b) => [b.id, b]));
  const catMap = new Map<string, Array<{ id: string; name: string; slug: string }>>();
  for (const r of catRows) {
    const list = catMap.get(r.productId) ?? [];
    list.push(r.category);
    catMap.set(r.productId, list);
  }

  const variantMap = new Map<string, Array<typeof productVariants.$inferSelect>>();
  for (const v of variantRows) {
    const list = variantMap.get(v.productId) ?? [];
    list.push(v);
    variantMap.set(v.productId, list);
  }

  const imageMap = new Map<string, Array<typeof productImages.$inferSelect>>();
  for (const img of imageRows) {
    const list = imageMap.get(img.productId) ?? [];
    list.push(img);
    imageMap.set(img.productId, list);
  }

  return productRows.map((p) =>
    mapToPublicProductDto(
      p,
      p.brandId ? (brandMap.get(p.brandId) ?? null) : null,
      catMap.get(p.id) ?? [],
      variantMap.get(p.id) ?? [],
      imageMap.get(p.id) ?? [],
    ),
  );
}

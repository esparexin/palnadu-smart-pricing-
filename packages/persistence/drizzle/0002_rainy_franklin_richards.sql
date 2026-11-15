CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"url" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"rights_status" text DEFAULT 'manual_upload' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_rights_status_ck" CHECK ("product_images"."rights_status" in ('manual_upload', 'verified_commercial')),
	CONSTRAINT "product_images_sort_order_ck" CHECK ("product_images"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_product_id" uuid NOT NULL,
	"target_product_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"confirmed_by_admin" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_relationships_type_ck" CHECK ("product_relationships"."relationship_type" in ('related', 'complementary', 'compatible')),
	CONSTRAINT "product_relationships_no_self_ck" CHECK ("product_relationships"."source_product_id" <> "product_relationships"."target_product_id")
);
--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "mrp_paise" bigint;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "offer_price_paise" bigint;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "discount_type" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "discount_value" bigint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" text DEFAULT 'piece' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "mrp_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "offer_price_paise" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_type" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_value" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relationships" ADD CONSTRAINT "product_relationships_source_product_id_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relationships" ADD CONSTRAINT "product_relationships_target_product_id_products_id_fk" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_images_variant_id_idx" ON "product_images" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_relationships_source_target_type_uq" ON "product_relationships" USING btree ("source_product_id","target_product_id","relationship_type");--> statement-breakpoint
CREATE INDEX "product_relationships_target_id_idx" ON "product_relationships" USING btree ("target_product_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_normalized_slug_uq" ON "brands" USING btree (lower(btrim("slug")));--> statement-breakpoint
CREATE UNIQUE INDEX "categories_normalized_slug_uq" ON "categories" USING btree (lower(btrim("slug")));--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_normalized_slug_uq" ON "products" USING btree (lower(btrim("slug")));--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_no_self_parent_ck" CHECK ("categories"."parent_id" is null or "categories"."parent_id" <> "categories"."id");--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_discount_type_ck" CHECK ("product_variants"."discount_type" is null or "product_variants"."discount_type" in ('none', 'fixed', 'percentage'));--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_offer_le_mrp_ck" CHECK ("product_variants"."mrp_paise" is null or "product_variants"."offer_price_paise" is null or "product_variants"."mrp_paise" = 0 or "product_variants"."offer_price_paise" <= "product_variants"."mrp_paise");--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_mrp_nonnegative_ck" CHECK ("product_variants"."mrp_paise" is null or "product_variants"."mrp_paise" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_offer_nonnegative_ck" CHECK ("product_variants"."offer_price_paise" is null or "product_variants"."offer_price_paise" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_discount_nonnegative_ck" CHECK ("product_variants"."discount_value" is null or "product_variants"."discount_value" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_discount_type_ck" CHECK ("products"."discount_type" in ('none', 'fixed', 'percentage'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_offer_le_mrp_ck" CHECK ("products"."mrp_paise" = 0 or "products"."offer_price_paise" <= "products"."mrp_paise");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_mrp_nonnegative_ck" CHECK ("products"."mrp_paise" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_offer_nonnegative_ck" CHECK ("products"."offer_price_paise" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_discount_nonnegative_ck" CHECK ("products"."discount_value" >= 0);
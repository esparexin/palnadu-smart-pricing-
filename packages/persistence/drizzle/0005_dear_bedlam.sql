CREATE TABLE "product_image_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"thumbnail_url" text,
	"source_domain" text NOT NULL,
	"provider_name" text NOT NULL,
	"source_type" text NOT NULL,
	"match_confidence" text NOT NULL,
	"model_matched" text,
	"licence_type" text NOT NULL,
	"attribution_text" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_image_candidates_source_type_ck" CHECK ("product_image_candidates"."source_type" in ('manufacturer', 'distributor', 'commercial_feed', 'web_search')),
	CONSTRAINT "product_image_candidates_confidence_ck" CHECK ("product_image_candidates"."match_confidence" in ('exact_model', 'prefix_match', 'brand_only', 'uncertain')),
	CONSTRAINT "product_image_candidates_licence_ck" CHECK ("product_image_candidates"."licence_type" in ('public_domain', 'commercial_allowed', 'attribution_required', 'unverified')),
	CONSTRAINT "product_image_candidates_status_ck" CHECK ("product_image_candidates"."status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "product_image_candidates" ADD CONSTRAINT "product_image_candidates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_image_candidates_product_id_idx" ON "product_image_candidates" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_image_candidates_status_idx" ON "product_image_candidates" USING btree ("status");
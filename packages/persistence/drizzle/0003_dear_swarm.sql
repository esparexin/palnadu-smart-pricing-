CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'piece' NOT NULL,
	"mrp_paise" bigint DEFAULT 0 NOT NULL,
	"offer_price_paise" bigint DEFAULT 0 NOT NULL,
	"discount_type" text DEFAULT 'none' NOT NULL,
	"discount_value" bigint DEFAULT 0 NOT NULL,
	"discount_amount_paise" bigint DEFAULT 0 NOT NULL,
	"final_unit_price_paise" bigint DEFAULT 0 NOT NULL,
	"line_total_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_items_quantity_positive_ck" CHECK ("quotation_items"."quantity" > 0),
	CONSTRAINT "quotation_items_discount_type_ck" CHECK ("quotation_items"."discount_type" in ('none', 'fixed', 'percentage')),
	CONSTRAINT "quotation_items_mrp_nonnegative_ck" CHECK ("quotation_items"."mrp_paise" >= 0),
	CONSTRAINT "quotation_items_offer_nonnegative_ck" CHECK ("quotation_items"."offer_price_paise" >= 0),
	CONSTRAINT "quotation_items_discount_val_nonnegative_ck" CHECK ("quotation_items"."discount_value" >= 0),
	CONSTRAINT "quotation_items_discount_amt_nonnegative_ck" CHECK ("quotation_items"."discount_amount_paise" >= 0),
	CONSTRAINT "quotation_items_unit_price_nonnegative_ck" CHECK ("quotation_items"."final_unit_price_paise" >= 0),
	CONSTRAINT "quotation_items_line_total_nonnegative_ck" CHECK ("quotation_items"."line_total_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quotation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"customer_notes" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"idempotency_key" text,
	"subtotal_paise" bigint DEFAULT 0 NOT NULL,
	"discount_total_paise" bigint DEFAULT 0 NOT NULL,
	"grand_total_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_requests_status_ck" CHECK ("quotation_requests"."status" in ('submitted', 'draft', 'issued', 'delivered', 'rejected')),
	CONSTRAINT "quotation_requests_subtotal_nonnegative_ck" CHECK ("quotation_requests"."subtotal_paise" >= 0),
	CONSTRAINT "quotation_requests_discount_nonnegative_ck" CHECK ("quotation_requests"."discount_total_paise" >= 0),
	CONSTRAINT "quotation_requests_grand_total_nonnegative_ck" CHECK ("quotation_requests"."grand_total_paise" >= 0)
);
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotation_requests_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_items_product_id_idx" ON "quotation_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_requests_ref_uq" ON "quotation_requests" USING btree ("reference_number");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_requests_idempotency_uq" ON "quotation_requests" USING btree ("idempotency_key") WHERE "quotation_requests"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "quotation_requests_status_idx" ON "quotation_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotation_requests_created_at_idx" ON "quotation_requests" USING btree ("created_at");
CREATE TABLE "inventory_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"alert_class" text NOT NULL,
	"threshold_snapshot" integer NOT NULL,
	"available_snapshot" integer NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"cleared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_alerts_class_ck" CHECK ("inventory_alerts"."alert_class" in ('low_stock', 'critical', 'out_of_stock')),
	CONSTRAINT "inventory_alerts_state_ck" CHECK ("inventory_alerts"."state" in ('active', 'cleared', 'acknowledged'))
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"location" text,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_configuration" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"stock_ownership" text DEFAULT 'smart_pricing' NOT NULL,
	"default_threshold" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_config_ownership_ck" CHECK ("inventory_configuration"."stock_ownership" in ('smart_pricing', 'external_erp'))
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"location" text,
	"quantity" integer NOT NULL,
	"movement_type" text NOT NULL,
	"reason" text,
	"external_reference" text,
	"actor_id" uuid,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_type_ck" CHECK ("inventory_movements"."movement_type" in ('opening_stock', 'inward', 'outward', 'adjustment'))
);
--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_alerts_variant_id_idx" ON "inventory_alerts" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "inventory_alerts_state_idx" ON "inventory_alerts" USING btree ("state");--> statement-breakpoint
CREATE INDEX "inventory_balances_variant_id_idx" ON "inventory_balances" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_variant_id_idx" ON "inventory_movements" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_idempotency_key_idx" ON "inventory_movements" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements" USING btree ("created_at");
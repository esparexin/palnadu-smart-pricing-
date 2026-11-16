CREATE TABLE "erp_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"endpoint_url" text,
	"auth_secret_encrypted" text,
	"product_ssot" text DEFAULT 'palnadu_smart_pricing' NOT NULL,
	"inventory_ssot" text DEFAULT 'palnadu_smart_pricing' NOT NULL,
	"price_ssot" text DEFAULT 'palnadu_smart_pricing' NOT NULL,
	"field_mappings" jsonb DEFAULT '{}'::jsonb,
	"last_sync_at" timestamp with time zone,
	"last_sync_status" text DEFAULT 'idle',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "erp_sync_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" uuid NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"items_processed" integer DEFAULT 0 NOT NULL,
	"items_created" integer DEFAULT 0 NOT NULL,
	"items_updated" integer DEFAULT 0 NOT NULL,
	"items_failed" integer DEFAULT 0 NOT NULL,
	"error_log" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "erp_sync_jobs" ADD CONSTRAINT "erp_sync_jobs_connector_id_erp_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."erp_connectors"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "company_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"company_name" text DEFAULT 'Palnadu Solar & Electricals' NOT NULL,
	"trading_name" text,
	"registered_address" text,
	"contact_email" text,
	"contact_phone" text,
	"website_url" text,
	"gstin" text,
	"logo_url" text,
	"quotation_terms" text,
	"bank_details" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD COLUMN "company_snapshot" jsonb;
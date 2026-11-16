ALTER TABLE "quotation_requests" ADD COLUMN "delivery_status" text DEFAULT 'not_applicable' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD COLUMN "delivery_provider_id" text;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD COLUMN "delivery_error" text;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD COLUMN "delivery_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD COLUMN "last_delivery_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD COLUMN "quotation_id" uuid;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_quotation_id_quotation_requests_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD CONSTRAINT "quotation_requests_delivery_status_ck" CHECK ("quotation_requests"."delivery_status" in ('not_applicable', 'pending', 'sent', 'delivered', 'failed'));
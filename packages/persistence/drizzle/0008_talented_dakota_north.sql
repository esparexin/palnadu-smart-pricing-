CREATE TABLE "whatsapp_configurations" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"phone_number_id" text DEFAULT '' NOT NULL,
	"waba_id" text DEFAULT '' NOT NULL,
	"verified_number" text,
	"api_version" text DEFAULT 'v20.0' NOT NULL,
	"access_token_encrypted" text,
	"app_secret_encrypted" text,
	"verify_token" text DEFAULT '' NOT NULL,
	"human_handover_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wamid" text NOT NULL,
	"direction" text NOT NULL,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"message_type" text NOT NULL,
	"content_summary" text NOT NULL,
	"raw_payload" jsonb,
	"status" text DEFAULT 'received' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_wamid_unique" UNIQUE("wamid")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_opt_outs" (
	"phone_number" text PRIMARY KEY NOT NULL,
	"reason" text,
	"opted_out_at" timestamp with time zone DEFAULT now() NOT NULL
);

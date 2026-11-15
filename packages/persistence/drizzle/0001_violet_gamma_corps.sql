CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_nonblank_ck" CHECK (length(btrim("admin_sessions"."session_token_hash")) > 0)
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_status_ck" CHECK ("admin_users"."status" in ('active', 'suspended')),
	CONSTRAINT "admin_users_email_nonblank_ck" CHECK (length(btrim("admin_users"."email")) > 0),
	CONSTRAINT "admin_users_name_nonblank_ck" CHECK (length(btrim("admin_users"."name")) > 0),
	CONSTRAINT "admin_users_password_hash_nonblank_ck" CHECK (length(btrim("admin_users"."password_hash")) > 0),
	CONSTRAINT "admin_users_permissions_array_ck" CHECK (jsonb_typeof("admin_users"."permissions") = 'array')
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_uq" ON "admin_sessions" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_id_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_normalized_email_uq" ON "admin_users" USING btree (lower(btrim("email")));--> statement-breakpoint
CREATE INDEX "admin_users_status_idx" ON "admin_users" USING btree ("status");
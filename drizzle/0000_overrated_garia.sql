CREATE TYPE "public"."admin_role" AS ENUM('admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'suspended', 'expired');--> statement-breakpoint
CREATE TYPE "public"."client_user_role" AS ENUM('client_admin', 'analyst', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."retention_status" AS ENUM('active', 'flagged_for_deletion', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."token_status" AS ENUM('active', 'in_progress', 'completed', 'expired');--> statement-breakpoint
CREATE TABLE "client_test_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"quota_total" integer NOT NULL,
	"quota_used" integer DEFAULT 0 NOT NULL,
	"quota_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_test_quotas_total_positive" CHECK ("client_test_quotas"."quota_total" >= 0),
	CONSTRAINT "client_test_quotas_used_non_negative" CHECK ("client_test_quotas"."quota_used" >= 0),
	CONSTRAINT "client_test_quotas_used_lte_total" CHECK ("client_test_quotas"."quota_used" <= "client_test_quotas"."quota_total")
);
--> statement-breakpoint
CREATE TABLE "client_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "client_user_role" DEFAULT 'client_admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"client_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"contract_starts_at" timestamp with time zone NOT NULL,
	"contract_ends_at" timestamp with time zone NOT NULL,
	"retention_days" integer DEFAULT 365 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_slug_unique" UNIQUE("slug"),
	CONSTRAINT "clients_retention_days_non_negative" CHECK ("clients"."retention_days" >= 0),
	CONSTRAINT "clients_contract_window" CHECK ("clients"."contract_ends_at" >= "clients"."contract_starts_at")
);
--> statement-breakpoint
CREATE TABLE "internal_admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internal_admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "participant_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"token_preview" text,
	"participant_reference" text,
	"status" "token_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"created_by_client_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participant_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"token_id" uuid NOT NULL,
	"raw_answers" jsonb NOT NULL,
	"scored_result" jsonb NOT NULL,
	"score_summary" jsonb,
	"interpretation" jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_until" timestamp with time zone NOT NULL,
	"retention_status" "retention_status" DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "results_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"test_key" text NOT NULL,
	"display_name" text NOT NULL,
	"version" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_test_quotas" ADD CONSTRAINT "client_test_quotas_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_test_quotas" ADD CONSTRAINT "client_test_quotas_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_tokens" ADD CONSTRAINT "participant_tokens_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_tokens" ADD CONSTRAINT "participant_tokens_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_tokens" ADD CONSTRAINT "participant_tokens_created_by_client_user_id_client_users_id_fk" FOREIGN KEY ("created_by_client_user_id") REFERENCES "public"."client_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_token_id_participant_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."participant_tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_test_quotas_client_test_unique" ON "client_test_quotas" USING btree ("client_id","test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_users_client_email_unique" ON "client_users" USING btree ("client_id","email");--> statement-breakpoint
CREATE INDEX "client_users_client_idx" ON "client_users" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "participant_tokens_client_status_idx" ON "participant_tokens" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "participant_tokens_client_test_idx" ON "participant_tokens" USING btree ("client_id","test_id");--> statement-breakpoint
CREATE INDEX "participant_tokens_expires_idx" ON "participant_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "results_client_test_idx" ON "results" USING btree ("client_id","test_id");--> statement-breakpoint
CREATE INDEX "results_retention_idx" ON "results" USING btree ("retention_until","retention_status");--> statement-breakpoint
CREATE UNIQUE INDEX "tests_client_key_version_unique" ON "tests" USING btree ("client_id","test_key","version");--> statement-breakpoint
CREATE INDEX "tests_client_idx" ON "tests" USING btree ("client_id");
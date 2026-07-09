CREATE TYPE "public"."participant_status" AS ENUM('active', 'archived', 'anonymized');--> statement-breakpoint
CREATE TABLE "participant_answer_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"participant_id" uuid,
	"token_id" uuid NOT NULL,
	"answers_json" jsonb NOT NULL,
	"current_question_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"token_id" uuid NOT NULL,
	"consent_version" text NOT NULL,
	"consent_text_snapshot" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"employee_id" text,
	"external_reference" text,
	"metadata" jsonb,
	"status" "participant_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "participant_tokens" ADD COLUMN "participant_id" uuid;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "participant_id" uuid;--> statement-breakpoint
ALTER TABLE "participant_answer_drafts" ADD CONSTRAINT "participant_answer_drafts_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_answer_drafts" ADD CONSTRAINT "participant_answer_drafts_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_answer_drafts" ADD CONSTRAINT "participant_answer_drafts_token_id_participant_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."participant_tokens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_consents" ADD CONSTRAINT "participant_consents_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_consents" ADD CONSTRAINT "participant_consents_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_consents" ADD CONSTRAINT "participant_consents_token_id_participant_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."participant_tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_answer_drafts_token_unique" ON "participant_answer_drafts" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "participant_answer_drafts_client_idx" ON "participant_answer_drafts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "participant_answer_drafts_participant_idx" ON "participant_answer_drafts" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "participant_consents_client_idx" ON "participant_consents" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "participant_consents_participant_idx" ON "participant_consents" USING btree ("participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_consents_token_unique" ON "participant_consents" USING btree ("token_id");--> statement-breakpoint
CREATE INDEX "participants_client_idx" ON "participants" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_client_email_unique" ON "participants" USING btree ("client_id","email") WHERE "participants"."email" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_client_employee_id_unique" ON "participants" USING btree ("client_id","employee_id") WHERE "participants"."employee_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_client_external_reference_unique" ON "participants" USING btree ("client_id","external_reference") WHERE "participants"."external_reference" is not null;--> statement-breakpoint
ALTER TABLE "participant_tokens" ADD CONSTRAINT "participant_tokens_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participant_tokens_client_participant_idx" ON "participant_tokens" USING btree ("client_id","participant_id");--> statement-breakpoint
CREATE INDEX "results_client_participant_idx" ON "results" USING btree ("client_id","participant_id");
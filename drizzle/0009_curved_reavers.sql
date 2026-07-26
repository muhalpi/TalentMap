CREATE TYPE "public"."result_source" AS ENUM('platform_assessment', 'xlsx_import');--> statement-breakpoint
ALTER TABLE "results" ALTER COLUMN "token_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "source" "result_source" DEFAULT 'platform_assessment' NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "imported_by_client_user_id" uuid;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "imported_file_name" text;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "imported_at" timestamp with time zone;--> statement-breakpoint
UPDATE "results"
SET
	"source" = 'xlsx_import'::"result_source",
	"imported_at" = "results"."submitted_at",
	"token_id" = NULL
FROM "participant_tokens"
WHERE "results"."token_id" = "participant_tokens"."id"
	AND "participant_tokens"."token_preview" = 'Imported XLSX';--> statement-breakpoint
DELETE FROM "participant_tokens"
WHERE "participant_tokens"."token_preview" = 'Imported XLSX'
	AND "participant_tokens"."status" = 'completed'::"token_status"
	AND "participant_tokens"."created_at" = "participant_tokens"."completed_at"
	AND NOT EXISTS (
		SELECT 1 FROM "results"
		WHERE "results"."token_id" = "participant_tokens"."id"
	)
	AND NOT EXISTS (
		SELECT 1 FROM "participant_consents"
		WHERE "participant_consents"."token_id" = "participant_tokens"."id"
	)
	AND NOT EXISTS (
		SELECT 1 FROM "participant_answer_drafts"
		WHERE "participant_answer_drafts"."token_id" = "participant_tokens"."id"
	);--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_imported_by_client_user_id_client_users_id_fk" FOREIGN KEY ("imported_by_client_user_id") REFERENCES "public"."client_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "results_client_source_idx" ON "results" USING btree ("client_id","source");--> statement-breakpoint
CREATE INDEX "results_imported_by_idx" ON "results" USING btree ("imported_by_client_user_id");--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_source_integrity" CHECK (("results"."source" = 'platform_assessment' and "results"."token_id" is not null) or ("results"."source" = 'xlsx_import' and "results"."token_id" is null and "results"."imported_at" is not null));

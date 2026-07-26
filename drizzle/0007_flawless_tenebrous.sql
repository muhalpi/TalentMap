ALTER TABLE "participant_answer_drafts" ADD COLUMN "question_timings_json" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "question_timings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD COLUMN "duration_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_duration_seconds_non_negative" CHECK ("results"."duration_seconds" >= 0);
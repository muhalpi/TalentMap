CREATE TABLE "participant_anonymization_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"requested_by_client_user_id" uuid,
	"anonymized_label" text NOT NULL,
	"reason" text,
	"tokens_expired" integer DEFAULT 0 NOT NULL,
	"reservations_released" integer DEFAULT 0 NOT NULL,
	"drafts_deleted" integer DEFAULT 0 NOT NULL,
	"consents_scrubbed" integer DEFAULT 0 NOT NULL,
	"results_unlinked" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participant_anonymization_audits_tokens_expired_non_negative" CHECK ("participant_anonymization_audits"."tokens_expired" >= 0),
	CONSTRAINT "participant_anonymization_audits_reservations_released_non_negative" CHECK ("participant_anonymization_audits"."reservations_released" >= 0),
	CONSTRAINT "participant_anonymization_audits_drafts_deleted_non_negative" CHECK ("participant_anonymization_audits"."drafts_deleted" >= 0),
	CONSTRAINT "participant_anonymization_audits_consents_scrubbed_non_negative" CHECK ("participant_anonymization_audits"."consents_scrubbed" >= 0),
	CONSTRAINT "participant_anonymization_audits_results_unlinked_non_negative" CHECK ("participant_anonymization_audits"."results_unlinked" >= 0)
);
--> statement-breakpoint
ALTER TABLE "participant_anonymization_audits" ADD CONSTRAINT "participant_anonymization_audits_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_anonymization_audits" ADD CONSTRAINT "participant_anonymization_audits_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_anonymization_audits" ADD CONSTRAINT "participant_anonymization_audits_requested_by_client_user_id_client_users_id_fk" FOREIGN KEY ("requested_by_client_user_id") REFERENCES "public"."client_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participant_anonymization_audits_client_idx" ON "participant_anonymization_audits" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "participant_anonymization_audits_participant_idx" ON "participant_anonymization_audits" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "participant_anonymization_audits_requested_by_idx" ON "participant_anonymization_audits" USING btree ("requested_by_client_user_id");
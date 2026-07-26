CREATE TYPE "public"."participant_field_type" AS ENUM('text', 'long_text', 'number', 'date', 'email', 'phone', 'select', 'multi_select', 'boolean');--> statement-breakpoint
CREATE TABLE "participant_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"field_key" text NOT NULL,
	"label" text NOT NULL,
	"field_type" "participant_field_type" NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_searchable" boolean DEFAULT true NOT NULL,
	"is_sensitive" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by_client_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participant_field_definitions_key_format" CHECK ("participant_field_definitions"."field_key" ~ '^[a-z][a-z0-9_]{0,62}$'),
	CONSTRAINT "participant_field_definitions_display_order_non_negative" CHECK ("participant_field_definitions"."display_order" >= 0),
	CONSTRAINT "participant_field_definitions_options_array" CHECK (jsonb_typeof("participant_field_definitions"."options") = 'array')
);
--> statement-breakpoint
ALTER TABLE "participant_field_definitions" ADD CONSTRAINT "participant_field_definitions_client_id_clients_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_field_definitions" ADD CONSTRAINT "participant_field_definitions_created_by_client_user_id_client_users_id_fk" FOREIGN KEY ("created_by_client_user_id") REFERENCES "public"."client_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_field_definitions_client_key_unique" ON "participant_field_definitions" USING btree ("client_id","field_key");--> statement-breakpoint
CREATE INDEX "participant_field_definitions_client_active_order_idx" ON "participant_field_definitions" USING btree ("client_id","is_active","display_order");
--> statement-breakpoint
INSERT INTO "participant_field_definitions" (
	"client_id",
	"field_key",
	"label",
	"field_type",
	"display_order"
)
SELECT DISTINCT "client_id", 'role', 'Role', 'text'::"participant_field_type", 0
FROM "participants"
WHERE nullif(btrim("metadata"->>'role'), '') IS NOT NULL
UNION ALL
SELECT DISTINCT "client_id", 'department', 'Department', 'text'::"participant_field_type", 1
FROM "participants"
WHERE nullif(btrim("metadata"->>'department'), '') IS NOT NULL
UNION ALL
SELECT DISTINCT "client_id", 'location', 'Location', 'text'::"participant_field_type", 2
FROM "participants"
WHERE nullif(btrim("metadata"->>'location'), '') IS NOT NULL
ON CONFLICT ("client_id", "field_key") DO NOTHING;
--> statement-breakpoint
UPDATE "participants"
SET "metadata" =
	(coalesce("metadata", '{}'::jsonb) - 'role' - 'department' - 'location')
	|| jsonb_build_object(
		'customFields',
		jsonb_strip_nulls(
			jsonb_build_object(
				'role', CASE
					WHEN nullif(btrim("metadata"->>'role'), '') IS NOT NULL THEN "metadata"->'role'
					ELSE NULL
				END,
				'department', CASE
					WHEN nullif(btrim("metadata"->>'department'), '') IS NOT NULL THEN "metadata"->'department'
					ELSE NULL
				END,
				'location', CASE
					WHEN nullif(btrim("metadata"->>'location'), '') IS NOT NULL THEN "metadata"->'location'
					ELSE NULL
				END
			)
		)
		|| CASE
			WHEN jsonb_typeof("metadata"->'customFields') = 'object'
				THEN "metadata"->'customFields'
			ELSE '{}'::jsonb
		END
	)
WHERE
	nullif(btrim("metadata"->>'role'), '') IS NOT NULL
	OR nullif(btrim("metadata"->>'department'), '') IS NOT NULL
	OR nullif(btrim("metadata"->>'location'), '') IS NOT NULL;

ALTER TABLE "participant_tokens" ADD COLUMN "test_key" text;--> statement-breakpoint
ALTER TABLE "participant_tokens" ADD COLUMN "access_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "participant_tokens"
SET "test_key" = "tests"."test_key"
FROM "tests"
WHERE "participant_tokens"."test_id" = "tests"."id"
  AND "participant_tokens"."client_id" = "tests"."client_id";--> statement-breakpoint
ALTER TABLE "participant_tokens" ALTER COLUMN "test_key" SET NOT NULL;--> statement-breakpoint
WITH "retired_tokens" AS (
  UPDATE "participant_tokens"
  SET
    "status" = 'expired'::"token_status",
    "last_activity_at" = now()
  WHERE "status" IN ('active'::"token_status", 'in_progress'::"token_status")
    AND "expires_at" <= now()
  RETURNING "client_id", "test_id"
),
"retired_groups" AS (
  SELECT "client_id", "test_id", count(*)::integer AS "retired_count"
  FROM "retired_tokens"
  GROUP BY "client_id", "test_id"
),
"release_plan" AS (
  SELECT
    "client_test_quotas"."id",
    least("client_test_quotas"."quota_reserved", "retired_groups"."retired_count")::integer AS "release_count"
  FROM "client_test_quotas"
  INNER JOIN "retired_groups"
    ON "retired_groups"."client_id" = "client_test_quotas"."client_id"
    AND "retired_groups"."test_id" = "client_test_quotas"."test_id"
)
UPDATE "client_test_quotas"
SET
  "quota_reserved" = "client_test_quotas"."quota_reserved" - "release_plan"."release_count",
  "quota_used" = "client_test_quotas"."quota_consumed" + "client_test_quotas"."quota_reserved" - "release_plan"."release_count",
  "updated_at" = now()
FROM "release_plan"
WHERE "client_test_quotas"."id" = "release_plan"."id";--> statement-breakpoint
WITH "ranked_live_assignments" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "client_id", "participant_id", "test_key"
      ORDER BY
        CASE WHEN "status" = 'in_progress'::"token_status" THEN 0 ELSE 1 END,
        "created_at" DESC,
        "id" DESC
    ) AS "assignment_rank"
  FROM "participant_tokens"
  WHERE "participant_id" IS NOT NULL
    AND "status" IN ('active'::"token_status", 'in_progress'::"token_status")
),
"retired_tokens" AS (
  UPDATE "participant_tokens"
  SET
    "status" = 'expired'::"token_status",
    "last_activity_at" = now()
  FROM "ranked_live_assignments"
  WHERE "participant_tokens"."id" = "ranked_live_assignments"."id"
    AND "ranked_live_assignments"."assignment_rank" > 1
  RETURNING "participant_tokens"."client_id", "participant_tokens"."test_id"
),
"retired_groups" AS (
  SELECT "client_id", "test_id", count(*)::integer AS "retired_count"
  FROM "retired_tokens"
  GROUP BY "client_id", "test_id"
),
"release_plan" AS (
  SELECT
    "client_test_quotas"."id",
    least("client_test_quotas"."quota_reserved", "retired_groups"."retired_count")::integer AS "release_count"
  FROM "client_test_quotas"
  INNER JOIN "retired_groups"
    ON "retired_groups"."client_id" = "client_test_quotas"."client_id"
    AND "retired_groups"."test_id" = "client_test_quotas"."test_id"
)
UPDATE "client_test_quotas"
SET
  "quota_reserved" = "client_test_quotas"."quota_reserved" - "release_plan"."release_count",
  "quota_used" = "client_test_quotas"."quota_consumed" + "client_test_quotas"."quota_reserved" - "release_plan"."release_count",
  "updated_at" = now()
FROM "release_plan"
WHERE "client_test_quotas"."id" = "release_plan"."id";--> statement-breakpoint
CREATE UNIQUE INDEX "participant_tokens_live_participant_test_key_unique" ON "participant_tokens" USING btree ("client_id","participant_id","test_key") WHERE "participant_tokens"."participant_id" is not null and "participant_tokens"."status" in ('active', 'in_progress');

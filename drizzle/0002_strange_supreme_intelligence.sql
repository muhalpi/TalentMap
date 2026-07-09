ALTER TABLE "client_test_quotas" ADD COLUMN "quota_reserved" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "client_test_quotas" ADD COLUMN "quota_consumed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH "quota_counts" AS (
	SELECT
		"client_id",
		"test_id",
		count(*) FILTER (WHERE "status" IN ('active', 'in_progress'))::integer AS "reserved_count",
		count(*) FILTER (WHERE "status" = 'completed')::integer AS "consumed_count"
	FROM "participant_tokens"
	GROUP BY "client_id", "test_id"
),
"quota_backfill" AS (
	SELECT
		"client_test_quotas"."id",
		least("quota_counts"."reserved_count", "client_test_quotas"."quota_total")::integer AS "quota_reserved",
		least(
			"quota_counts"."consumed_count",
			greatest(
				"client_test_quotas"."quota_total" - least("quota_counts"."reserved_count", "client_test_quotas"."quota_total"),
				0
			)
		)::integer AS "quota_consumed"
	FROM "client_test_quotas"
	INNER JOIN "quota_counts"
		ON "quota_counts"."client_id" = "client_test_quotas"."client_id"
		AND "quota_counts"."test_id" = "client_test_quotas"."test_id"
)
UPDATE "client_test_quotas"
SET
	"quota_reserved" = "quota_backfill"."quota_reserved",
	"quota_consumed" = "quota_backfill"."quota_consumed",
	"quota_used" = "quota_backfill"."quota_reserved" + "quota_backfill"."quota_consumed",
	"updated_at" = now()
FROM "quota_backfill"
WHERE "client_test_quotas"."id" = "quota_backfill"."id";--> statement-breakpoint
ALTER TABLE "client_test_quotas" ADD CONSTRAINT "client_test_quotas_reserved_non_negative" CHECK ("client_test_quotas"."quota_reserved" >= 0);--> statement-breakpoint
ALTER TABLE "client_test_quotas" ADD CONSTRAINT "client_test_quotas_consumed_non_negative" CHECK ("client_test_quotas"."quota_consumed" >= 0);--> statement-breakpoint
ALTER TABLE "client_test_quotas" ADD CONSTRAINT "client_test_quotas_reserved_consumed_lte_total" CHECK ("client_test_quotas"."quota_reserved" + "client_test_quotas"."quota_consumed" <= "client_test_quotas"."quota_total");

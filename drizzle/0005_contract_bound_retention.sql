UPDATE "results"
SET
  "retention_until" = "clients"."contract_ends_at",
  "retention_status" = CASE
    WHEN "clients"."contract_ends_at" > now()
      AND "results"."retention_status" = 'flagged_for_deletion'
      THEN 'active'::"retention_status"
    ELSE "results"."retention_status"
  END
FROM "clients"
WHERE "results"."client_id" = "clients"."client_id"
  AND "results"."retention_status" <> 'deleted';

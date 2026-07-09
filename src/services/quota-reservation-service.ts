import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";

export interface QuotaReservationCleanupResult {
  ranAt: string;
  expiredTokens: number;
  releasedReservations: number;
  quotaRowsUpdated: number;
}

interface CleanupRow extends Record<string, unknown> {
  expired_tokens: number | string | bigint;
  released_reservations: number | string | bigint;
  quota_rows_updated: number | string | bigint;
}

function toNumber(value: number | string | bigint | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10);
  }

  return 0;
}

export async function runQuotaReservationCleanup(
  now = new Date(),
): Promise<QuotaReservationCleanupResult> {
  const db = getDb();
  const result = await db.execute<CleanupRow>(sql`
    with expired_tokens as (
      update participant_tokens
      set
        status = 'expired'::token_status,
        last_activity_at = ${now}
      where
        status in ('active'::token_status, 'in_progress'::token_status)
        and expires_at <= ${now}
      returning client_id, test_id
    ),
    expired_groups as (
      select
        client_id,
        test_id,
        count(*)::integer as expired_count
      from expired_tokens
      group by client_id, test_id
    ),
    release_plan as (
      select
        client_test_quotas.id,
        expired_groups.expired_count,
        least(client_test_quotas.quota_reserved, expired_groups.expired_count)::integer as release_count
      from client_test_quotas
      inner join expired_groups
        on expired_groups.client_id = client_test_quotas.client_id
        and expired_groups.test_id = client_test_quotas.test_id
    ),
    quota_updates as (
      update client_test_quotas
      set
        quota_reserved = client_test_quotas.quota_reserved - release_plan.release_count,
        quota_used = client_test_quotas.quota_consumed + client_test_quotas.quota_reserved - release_plan.release_count,
        updated_at = ${now}
      from release_plan
      where client_test_quotas.id = release_plan.id
      returning release_plan.release_count
    )
    select
      coalesce((select sum(expired_count) from expired_groups), 0)::integer as expired_tokens,
      coalesce((select sum(release_count) from quota_updates), 0)::integer as released_reservations,
      coalesce((select count(*) from quota_updates), 0)::integer as quota_rows_updated
  `);

  const row = result.rows[0];

  return {
    ranAt: now.toISOString(),
    expiredTokens: toNumber(row?.expired_tokens),
    releasedReservations: toNumber(row?.released_reservations),
    quotaRowsUpdated: toNumber(row?.quota_rows_updated),
  };
}

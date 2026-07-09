import { randomBytes } from "node:crypto";

import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";

export interface AnonymizeParticipantInput {
  clientId: string;
  participantId: string;
  requestedByClientUserId: string;
  reason?: string | null;
}

export interface AnonymizeParticipantResult {
  participantId: string;
  anonymizedLabel: string;
  tokensExpired: number;
  reservationsReleased: number;
  draftsDeleted: number;
  consentsScrubbed: number;
  resultsUnlinked: number;
}

interface AnonymizationRow extends Record<string, unknown> {
  participant_id: string;
  anonymized_label: string;
  tokens_expired: number | string | bigint;
  reservations_released: number | string | bigint;
  drafts_deleted: number | string | bigint;
  consents_scrubbed: number | string | bigint;
  results_unlinked: number | string | bigint;
}

function anonymizedLabel() {
  return `Deleted_User_${randomBytes(3).toString("hex").toUpperCase()}`;
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

export async function anonymizeParticipant({
  clientId,
  participantId,
  requestedByClientUserId,
  reason,
}: AnonymizeParticipantInput): Promise<AnonymizeParticipantResult> {
  const db = getDb();
  const now = new Date();
  const label = anonymizedLabel();
  const normalizedReason = reason?.trim() || null;
  const result = await db.execute<AnonymizationRow>(sql`
    with target_participant as (
      select id
      from participants
      where
        client_id = ${clientId}
        and id = ${participantId}
        and status <> 'anonymized'::participant_status
        and deleted_at is null
    ),
    target_tokens as (
      select id, client_id, test_id, status
      from participant_tokens
      where
        client_id = ${clientId}
        and participant_id in (select id from target_participant)
    ),
    updated_participant as (
      update participants
      set
        name = ${label},
        email = null,
        employee_id = null,
        external_reference = null,
        metadata = null,
        status = 'anonymized'::participant_status,
        deleted_at = ${now},
        anonymized_at = ${now},
        updated_at = ${now}
      where id in (select id from target_participant)
      returning id
    ),
    updated_tokens as (
      update participant_tokens
      set
        participant_id = null,
        participant_reference = null,
        status = case
          when target_tokens.status in ('active'::token_status, 'in_progress'::token_status)
            then 'expired'::token_status
          else participant_tokens.status
        end,
        last_activity_at = case
          when target_tokens.status in ('active'::token_status, 'in_progress'::token_status)
            then ${now}
          else participant_tokens.last_activity_at
        end
      from target_tokens
      where participant_tokens.id = target_tokens.id
      returning
        target_tokens.client_id,
        target_tokens.test_id,
        target_tokens.status as previous_status
    ),
    expired_groups as (
      select
        client_id,
        test_id,
        count(*)::integer as expired_count
      from updated_tokens
      where previous_status in ('active'::token_status, 'in_progress'::token_status)
      group by client_id, test_id
    ),
    release_plan as (
      select
        client_test_quotas.id,
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
    ),
    deleted_drafts as (
      delete from participant_answer_drafts
      where
        client_id = ${clientId}
        and (
          participant_id in (select id from target_participant)
          or token_id in (select id from target_tokens)
        )
      returning id
    ),
    scrubbed_consents as (
      update participant_consents
      set
        ip_hash = null,
        user_agent = null
      where
        client_id = ${clientId}
        and participant_id in (select id from target_participant)
      returning id
    ),
    unlinked_results as (
      update results
      set participant_id = null
      where
        client_id = ${clientId}
        and participant_id in (select id from target_participant)
      returning id
    ),
    audit as (
      insert into participant_anonymization_audits (
        client_id,
        participant_id,
        requested_by_client_user_id,
        anonymized_label,
        reason,
        tokens_expired,
        reservations_released,
        drafts_deleted,
        consents_scrubbed,
        results_unlinked,
        created_at
      )
      select
        ${clientId},
        updated_participant.id,
        ${requestedByClientUserId},
        ${label},
        ${normalizedReason},
        coalesce((select count(*) from updated_tokens where previous_status in ('active'::token_status, 'in_progress'::token_status)), 0)::integer,
        coalesce((select sum(release_count) from quota_updates), 0)::integer,
        coalesce((select count(*) from deleted_drafts), 0)::integer,
        coalesce((select count(*) from scrubbed_consents), 0)::integer,
        coalesce((select count(*) from unlinked_results), 0)::integer,
        ${now}
      from updated_participant
      returning
        participant_id,
        anonymized_label,
        tokens_expired,
        reservations_released,
        drafts_deleted,
        consents_scrubbed,
        results_unlinked
    )
    select
      participant_id,
      anonymized_label,
      tokens_expired,
      reservations_released,
      drafts_deleted,
      consents_scrubbed,
      results_unlinked
    from audit
  `);

  const row = result.rows[0];

  if (!row) {
    throw new Error("Participant was not found or has already been anonymized.");
  }

  return {
    participantId: row.participant_id,
    anonymizedLabel: row.anonymized_label,
    tokensExpired: toNumber(row.tokens_expired),
    reservationsReleased: toNumber(row.reservations_released),
    draftsDeleted: toNumber(row.drafts_deleted),
    consentsScrubbed: toNumber(row.consents_scrubbed),
    resultsUnlinked: toNumber(row.results_unlinked),
  };
}

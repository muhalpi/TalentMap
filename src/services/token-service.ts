import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  clientTestQuotas,
  clients,
  participants,
  participantTokens,
  tests,
} from "@/db/schema";
import {
  generateParticipantAccessCode,
  hashParticipantAccessCode,
} from "@/lib/crypto";

export interface GenerateParticipantAccessInput {
  clientId: string;
  testId: string;
  createdByClientUserId?: string;
  participantId: string;
  expiresAt?: Date;
}

export interface GeneratedParticipantAccess {
  accessCode: string;
  accessPath: string;
  accessVersion: number;
  expiresAt: Date;
}

export interface ReissueParticipantAccessInput {
  clientId: string;
  tokenId: string;
  requestedByClientUserId?: string;
}

export interface CancelParticipantAccessInput {
  clientId: string;
  tokenId: string;
}

export interface CancelledParticipantAccess {
  cancelledAt: Date;
}

interface ReissueTokenRow extends Record<string, unknown> {
  token_hash: string;
  expires_at: Date | string;
  access_version: number | string | bigint;
}

interface CancelTokenRow extends Record<string, unknown> {
  cancelled: boolean;
}

const LIVE_ASSIGNMENT_CONSTRAINT =
  "participant_tokens_live_participant_test_key_unique";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function minDate(left: Date, right: Date) {
  return left.getTime() <= right.getTime() ? left : right;
}

function accessCodePreview(accessCode: string) {
  const suffix = accessCode.split("-").at(-1) ?? accessCode.slice(-4);
  return `TM-XXXX-XXXX-XXXX-${suffix}`;
}

function isLiveAssignmentConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : "";

  if (
    record.constraint === LIVE_ASSIGNMENT_CONSTRAINT ||
    message.includes(LIVE_ASSIGNMENT_CONSTRAINT)
  ) {
    return true;
  }

  return isLiveAssignmentConflict(record.cause);
}

async function expireStaleParticipantAccess({
  clientId,
  participantId,
  testKey,
  now,
}: {
  clientId: string;
  participantId: string;
  testKey: string;
  now: Date;
}) {
  const db = getDb();

  await db.execute(sql`
    with expired_tokens as (
      update participant_tokens
      set
        status = 'expired'::token_status,
        last_activity_at = ${now}
      from tests
      where
        participant_tokens.client_id = ${clientId}
        and participant_tokens.participant_id = ${participantId}
        and participant_tokens.test_id = tests.id
        and participant_tokens.client_id = tests.client_id
        and tests.test_key = ${testKey}
        and participant_tokens.status in ('active'::token_status, 'in_progress'::token_status)
        and participant_tokens.expires_at <= ${now}
      returning participant_tokens.client_id, participant_tokens.test_id
    ),
    expired_groups as (
      select client_id, test_id, count(*)::integer as expired_count
      from expired_tokens
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
    )
    update client_test_quotas
    set
      quota_reserved = client_test_quotas.quota_reserved - release_plan.release_count,
      quota_used = client_test_quotas.quota_consumed + client_test_quotas.quota_reserved - release_plan.release_count,
      updated_at = ${now}
    from release_plan
    where client_test_quotas.id = release_plan.id
  `);
}

export async function generateClientParticipantAccess({
  clientId,
  testId,
  createdByClientUserId,
  participantId,
  expiresAt,
}: GenerateParticipantAccessInput): Promise<GeneratedParticipantAccess> {
  const db = getDb();
  const [participant] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.clientId, clientId),
        eq(participants.id, participantId),
        eq(participants.status, "active"),
        isNull(participants.deletedAt),
      ),
    )
    .limit(1);

  if (!participant) {
    throw new Error("Participant was not found for this client.");
  }

  const verifiedParticipantId = participant.id;

  const [context] = await db
    .select({
      clientId: clients.clientId,
      clientStatus: clients.status,
      contractEndsAt: clients.contractEndsAt,
      testId: tests.id,
      testKey: tests.testKey,
      testEnabled: tests.isEnabled,
      quotaId: clientTestQuotas.id,
      quotaTotal: clientTestQuotas.quotaTotal,
      quotaUsed: clientTestQuotas.quotaUsed,
      quotaReserved: clientTestQuotas.quotaReserved,
      quotaConsumed: clientTestQuotas.quotaConsumed,
      quotaExpiresAt: clientTestQuotas.quotaExpiresAt,
    })
    .from(clients)
    .innerJoin(
      tests,
      and(eq(tests.clientId, clients.clientId), eq(tests.id, testId)),
    )
    .innerJoin(
      clientTestQuotas,
      and(
        eq(clientTestQuotas.clientId, clients.clientId),
        eq(clientTestQuotas.testId, tests.id),
      ),
    )
    .where(and(eq(clients.clientId, clientId), eq(tests.id, testId)))
    .limit(1);

  if (!context) {
    throw new Error("Client/test entitlement was not found.");
  }

  if (context.clientStatus !== "active") {
    throw new Error("Client contract is not active.");
  }

  if (!context.testEnabled) {
    throw new Error("Test is not enabled for this client.");
  }

  const now = new Date();
  const quotaExpiry = context.quotaExpiresAt ?? context.contractEndsAt;
  const effectiveExpiry = minDate(
    expiresAt ?? addDays(now, 30),
    minDate(context.contractEndsAt, quotaExpiry),
  );

  if (effectiveExpiry.getTime() <= now.getTime()) {
    throw new Error(
      "Cannot create assessment access because the entitlement has expired.",
    );
  }

  await expireStaleParticipantAccess({
    clientId,
    participantId: verifiedParticipantId,
    testKey: context.testKey,
    now,
  });

  const [liveAssignment] = await db
    .select({ id: participantTokens.id })
    .from(participantTokens)
    .where(
      and(
        eq(participantTokens.clientId, clientId),
        eq(participantTokens.participantId, verifiedParticipantId),
        eq(participantTokens.testKey, context.testKey),
        inArray(participantTokens.status, ["active", "in_progress"]),
      ),
    )
    .limit(1);

  if (liveAssignment) {
    throw new Error(
      `This participant already has a live ${context.testKey.toUpperCase()} assessment. Rotate its access code or wait until it is completed or expired.`,
    );
  }

  const accessCode = generateParticipantAccessCode();

  const [updatedQuota] = await db
    .update(clientTestQuotas)
    .set({
      quotaUsed: sql`${clientTestQuotas.quotaReserved} + 1 + ${clientTestQuotas.quotaConsumed}`,
      quotaReserved: sql`${clientTestQuotas.quotaReserved} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(clientTestQuotas.id, context.quotaId),
        eq(clientTestQuotas.clientId, clientId),
        sql`${clientTestQuotas.quotaReserved} + ${clientTestQuotas.quotaConsumed} < ${clientTestQuotas.quotaTotal}`,
      ),
    )
    .returning({ id: clientTestQuotas.id });

  if (!updatedQuota) {
    throw new Error("Client quota has been exhausted for this test.");
  }

  try {
    await db.insert(participantTokens).values({
      clientId,
      testId,
      testKey: context.testKey,
      participantId: verifiedParticipantId,
      tokenHash: hashParticipantAccessCode(accessCode),
      tokenPreview: accessCodePreview(accessCode),
      expiresAt: effectiveExpiry,
      createdByClientUserId,
    });
  } catch (error) {
    await db
      .update(clientTestQuotas)
      .set({
        quotaUsed: sql`${clientTestQuotas.quotaConsumed} + greatest(${clientTestQuotas.quotaReserved} - 1, 0)`,
        quotaReserved: sql`greatest(${clientTestQuotas.quotaReserved} - 1, 0)`,
        updatedAt: now,
      })
      .where(
        and(
          eq(clientTestQuotas.id, context.quotaId),
          eq(clientTestQuotas.clientId, clientId),
        ),
      );

    if (isLiveAssignmentConflict(error)) {
      throw new Error(
        `This participant already has a live ${context.testKey.toUpperCase()} assessment. Rotate its access code or wait until it is completed or expired.`,
      );
    }

    throw error;
  }

  return {
    accessCode,
    accessPath: "/test",
    accessVersion: 1,
    expiresAt: effectiveExpiry,
  };
}

function numberFromSql(value: number | string | bigint | null | undefined) {
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

export async function reissueClientParticipantAccess(
  input: ReissueParticipantAccessInput,
): Promise<GeneratedParticipantAccess> {
  const { clientId, tokenId } = input;
  const db = getDb();
  const now = new Date();
  const result = await db.execute<ReissueTokenRow>(sql`
    select
      participant_tokens.token_hash,
      participant_tokens.expires_at,
      participant_tokens.access_version
    from participant_tokens
    inner join clients
      on clients.client_id = participant_tokens.client_id
    inner join tests
      on tests.id = participant_tokens.test_id
      and tests.client_id = participant_tokens.client_id
    left join participants
      on participants.id = participant_tokens.participant_id
      and participants.client_id = participant_tokens.client_id
    where
      participant_tokens.id = ${tokenId}
      and participant_tokens.client_id = ${clientId}
      and participant_tokens.status in ('active'::token_status, 'in_progress'::token_status)
      and participant_tokens.completed_at is null
      and participant_tokens.expires_at > ${now}
      and clients.status = 'active'::client_status
      and tests.is_enabled = true
      and (
        (
          participant_tokens.participant_id is not null
          and participants.id is not null
          and participants.status = 'active'::participant_status
          and participants.deleted_at is null
        )
        or (
          participant_tokens.participant_id is null
          and participant_tokens.participant_reference is not null
        )
      )
    limit 1
  `);
  const row = result.rows[0];

  if (!row) {
    throw new Error(
      "Access can only be rotated for a live assessment and an active participant.",
    );
  }

  const accessCode = generateParticipantAccessCode();
  const updated = await db.execute<ReissueTokenRow>(sql`
    update participant_tokens
    set
      token_hash = ${hashParticipantAccessCode(accessCode)},
      token_preview = ${accessCodePreview(accessCode)},
      access_version = participant_tokens.access_version + 1,
      last_activity_at = ${now}
    where
      id = ${tokenId}
      and client_id = ${clientId}
      and token_hash = ${row.token_hash}
      and status in ('active'::token_status, 'in_progress'::token_status)
      and completed_at is null
      and expires_at > ${now}
    returning token_hash, expires_at, access_version
  `);
  const rotated = updated.rows[0];

  if (!rotated) {
    throw new Error(
      "The access code changed during this request. Refresh and try again.",
    );
  }

  return {
    accessCode,
    accessPath: "/test",
    accessVersion: numberFromSql(rotated.access_version),
    expiresAt:
      rotated.expires_at instanceof Date
        ? rotated.expires_at
        : new Date(rotated.expires_at),
  };
}

export async function cancelClientParticipantAccess({
  clientId,
  tokenId,
}: CancelParticipantAccessInput): Promise<CancelledParticipantAccess> {
  const db = getDb();
  const now = new Date();
  const result = await db.execute<CancelTokenRow>(sql`
    with cancelled_token as (
      update participant_tokens
      set
        status = 'expired'::token_status,
        expires_at = least(participant_tokens.expires_at, ${now}),
        last_activity_at = ${now}
      where
        participant_tokens.id = ${tokenId}
        and participant_tokens.client_id = ${clientId}
        and participant_tokens.status in ('active'::token_status, 'in_progress'::token_status)
        and participant_tokens.completed_at is null
      returning participant_tokens.client_id, participant_tokens.test_id
    ),
    quota_update as (
      update client_test_quotas
      set
        quota_reserved = greatest(client_test_quotas.quota_reserved - 1, 0),
        quota_used = client_test_quotas.quota_consumed + greatest(client_test_quotas.quota_reserved - 1, 0),
        updated_at = ${now}
      from cancelled_token
      where
        client_test_quotas.client_id = cancelled_token.client_id
        and client_test_quotas.test_id = cancelled_token.test_id
      returning client_test_quotas.id
    )
    select exists(select 1 from cancelled_token) as cancelled
  `);

  if (!result.rows[0]?.cancelled) {
    throw new Error("Only a live assessment can be cancelled.");
  }

  return { cancelledAt: now };
}

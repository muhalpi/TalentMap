import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  clientTestQuotas,
  clients,
  participants,
  participantTokens,
  tests,
} from "@/db/schema";
import {
  generateParticipantToken,
  hashParticipantToken,
} from "@/lib/crypto";

export interface GenerateParticipantTokenInput {
  clientId: string;
  testId: string;
  createdByClientUserId?: string;
  participantId?: string;
  participantReference?: string;
  expiresAt?: Date;
}

export interface GeneratedParticipantToken {
  token: string;
  urlPath: string;
  expiresAt: Date;
}

export interface ReissueParticipantTokenInput {
  clientId: string;
  tokenId: string;
  requestedByClientUserId?: string;
}

interface ReissueTokenRow extends Record<string, unknown> {
  client_id: string;
  test_id: string;
  participant_id: string | null;
  participant_reference: string | null;
  quota_rows_updated: number | string | bigint;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function minDate(left: Date, right: Date) {
  return left.getTime() <= right.getTime() ? left : right;
}

export async function generateClientParticipantToken({
  clientId,
  testId,
  createdByClientUserId,
  participantId,
  participantReference,
  expiresAt,
}: GenerateParticipantTokenInput): Promise<GeneratedParticipantToken> {
  const db = getDb();
  let verifiedParticipantId: string | undefined;

  if (participantId) {
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

    verifiedParticipantId = participant.id;
  }

  const [context] = await db
    .select({
      clientId: clients.clientId,
      clientStatus: clients.status,
      contractEndsAt: clients.contractEndsAt,
      testId: tests.id,
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

  if (context.quotaReserved + context.quotaConsumed >= context.quotaTotal) {
    throw new Error("Client quota has been exhausted for this test.");
  }

  const now = new Date();
  const quotaExpiry = context.quotaExpiresAt ?? context.contractEndsAt;
  const effectiveExpiry = minDate(
    expiresAt ?? addDays(now, 30),
    minDate(context.contractEndsAt, quotaExpiry),
  );

  if (effectiveExpiry.getTime() <= now.getTime()) {
    throw new Error("Cannot generate a token because the entitlement has expired.");
  }

  const token = generateParticipantToken();

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
      participantId: verifiedParticipantId,
      tokenHash: hashParticipantToken(token),
      tokenPreview: `${token.slice(0, 7)}...${token.slice(-6)}`,
      participantReference: verifiedParticipantId ? undefined : participantReference,
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

    throw error;
  }

  return {
    token,
    urlPath: `/test/${token}`,
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

export async function reissueClientParticipantToken({
  clientId,
  tokenId,
  requestedByClientUserId,
}: ReissueParticipantTokenInput): Promise<GeneratedParticipantToken> {
  const db = getDb();
  const now = new Date();
  const result = await db.execute<ReissueTokenRow>(sql`
    with target_token as (
      select
        participant_tokens.id,
        participant_tokens.client_id,
        participant_tokens.test_id,
        participant_tokens.participant_id,
        participant_tokens.participant_reference
      from participant_tokens
      inner join clients
        on clients.client_id = participant_tokens.client_id
      inner join tests
        on tests.id = participant_tokens.test_id
        and tests.client_id = participant_tokens.client_id
      inner join client_test_quotas
        on client_test_quotas.client_id = participant_tokens.client_id
        and client_test_quotas.test_id = participant_tokens.test_id
      left join participants
        on participants.id = participant_tokens.participant_id
        and participants.client_id = participant_tokens.client_id
      where
        participant_tokens.id = ${tokenId}
        and participant_tokens.client_id = ${clientId}
        and participant_tokens.status = 'active'::token_status
        and participant_tokens.started_at is null
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
    ),
    retired_token as (
      update participant_tokens
      set
        status = 'expired'::token_status,
        last_activity_at = ${now}
      from target_token
      where
        participant_tokens.id = target_token.id
        and participant_tokens.client_id = target_token.client_id
        and participant_tokens.status = 'active'::token_status
        and participant_tokens.started_at is null
        and participant_tokens.completed_at is null
      returning
        target_token.client_id,
        target_token.test_id,
        target_token.participant_id,
        target_token.participant_reference
    ),
    quota_update as (
      update client_test_quotas
      set
        quota_reserved = greatest(client_test_quotas.quota_reserved - 1, 0),
        quota_used = client_test_quotas.quota_consumed + greatest(client_test_quotas.quota_reserved - 1, 0),
        updated_at = ${now}
      from retired_token
      where
        client_test_quotas.client_id = retired_token.client_id
        and client_test_quotas.test_id = retired_token.test_id
      returning client_test_quotas.id
    )
    select
      retired_token.client_id,
      retired_token.test_id,
      retired_token.participant_id,
      retired_token.participant_reference,
      (select count(*) from quota_update)::integer as quota_rows_updated
    from retired_token
  `);
  const row = result.rows[0];

  if (!row || numberFromSql(row.quota_rows_updated) < 1) {
    throw new Error(
      "Token can only be reissued before the participant starts the assessment.",
    );
  }

  return generateClientParticipantToken({
    clientId: row.client_id,
    testId: row.test_id,
    createdByClientUserId: requestedByClientUserId,
    participantId: row.participant_id ?? undefined,
    participantReference: row.participant_id
      ? undefined
      : row.participant_reference ?? undefined,
  });
}

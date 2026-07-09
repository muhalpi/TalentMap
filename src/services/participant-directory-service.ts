import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";

import { getDb } from "@/db/client";
import { participantTokens, participants, results, tests } from "@/db/schema";

type ParticipantStatus = "active" | "archived" | "anonymized";
type TokenStatus = "active" | "in_progress" | "completed" | "expired";
type RetentionStatus = "active" | "flagged_for_deletion" | "deleted";

export interface ParticipantMetadataDto {
  role?: string;
  department?: string;
  location?: string;
  tags?: string[];
}

export interface ParticipantDirectoryItemDto {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  externalReference: string | null;
  metadata: ParticipantMetadataDto | null;
  status: Exclude<ParticipantStatus, "anonymized">;
  createdAt: string;
  updatedAt: string;
  tokenCount: number;
  completedAssessmentCount: number;
  latestActivityAt: string | null;
}

export interface ParticipantAssessmentHistoryDto {
  tokenId: string;
  tokenPreview: string | null;
  participantReference: string | null;
  testKey: string;
  testName: string;
  tokenStatus: TokenStatus;
  tokenCreatedAt: string;
  expiresAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  result: {
    id: string;
    resultLabel: string;
    submittedAt: string;
    retentionUntil: string;
    retentionStatus: RetentionStatus;
  } | null;
}

export interface ParticipantDetailDto extends ParticipantDirectoryItemDto {
  assessmentHistory: ParticipantAssessmentHistoryDto[];
}

function toIso(date: Date | null) {
  return date ? date.toISOString() : null;
}

function resultLabel(scoreSummary: Record<string, unknown> | null) {
  const type = scoreSummary?.type;
  return typeof type === "string" ? type : "Pending";
}

function stringFromMetadata(
  metadata: Record<string, unknown> | null,
  key: keyof ParticipantMetadataDto,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function metadataDto(
  metadata: Record<string, unknown> | null,
): ParticipantMetadataDto | null {
  const tagsValue = metadata?.tags;
  const tags = Array.isArray(tagsValue)
    ? tagsValue.filter((tag): tag is string => typeof tag === "string")
    : undefined;
  const dto: ParticipantMetadataDto = {
    role: stringFromMetadata(metadata, "role"),
    department: stringFromMetadata(metadata, "department"),
    location: stringFromMetadata(metadata, "location"),
    tags: tags?.length ? tags : undefined,
  };

  return Object.values(dto).some(Boolean) ? dto : null;
}

function latestIso(dates: (Date | null)[]) {
  const latest = dates
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return toIso(latest ?? null);
}

function mapParticipant(row: {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  externalReference: string | null;
  metadata: Record<string, unknown> | null;
  status: ParticipantStatus;
  createdAt: Date;
  updatedAt: Date;
}): ParticipantDirectoryItemDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    employeeId: row.employeeId,
    externalReference: row.externalReference,
    metadata: metadataDto(row.metadata),
    status: row.status === "archived" ? "archived" : "active",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tokenCount: 0,
    completedAssessmentCount: 0,
    latestActivityAt: null,
  };
}

export async function getClientParticipants(
  clientId: string,
): Promise<ParticipantDirectoryItemDto[]> {
  const db = getDb();
  const participantRows = await db
    .select({
      id: participants.id,
      name: participants.name,
      email: participants.email,
      employeeId: participants.employeeId,
      externalReference: participants.externalReference,
      metadata: participants.metadata,
      status: participants.status,
      createdAt: participants.createdAt,
      updatedAt: participants.updatedAt,
    })
    .from(participants)
    .where(
      and(
        eq(participants.clientId, clientId),
        ne(participants.status, "anonymized"),
        isNull(participants.deletedAt),
      ),
    )
    .orderBy(desc(participants.updatedAt), desc(participants.createdAt));

  if (!participantRows.length) {
    return [];
  }

  const participantIds = participantRows.map((row) => row.id);
  const [tokenRows, resultRows] = await Promise.all([
    db
      .select({
        participantId: participantTokens.participantId,
        createdAt: participantTokens.createdAt,
        lastActivityAt: participantTokens.lastActivityAt,
        completedAt: participantTokens.completedAt,
      })
      .from(participantTokens)
      .where(
        and(
          eq(participantTokens.clientId, clientId),
          inArray(participantTokens.participantId, participantIds),
        ),
      ),
    db
      .select({
        participantId: results.participantId,
        submittedAt: results.submittedAt,
      })
      .from(results)
      .where(
        and(
          eq(results.clientId, clientId),
          inArray(results.participantId, participantIds),
          ne(results.retentionStatus, "deleted"),
        ),
      ),
  ]);

  const byParticipant = new Map(
    participantRows.map((row) => [row.id, mapParticipant(row)]),
  );
  const activityDates = new Map<string, (Date | null)[]>();

  for (const token of tokenRows) {
    if (!token.participantId) {
      continue;
    }

    const participant = byParticipant.get(token.participantId);

    if (!participant) {
      continue;
    }

    participant.tokenCount += 1;
    activityDates.set(token.participantId, [
      ...(activityDates.get(token.participantId) ?? []),
      token.createdAt,
      token.lastActivityAt,
      token.completedAt,
    ]);
  }

  for (const result of resultRows) {
    if (!result.participantId) {
      continue;
    }

    const participant = byParticipant.get(result.participantId);

    if (!participant) {
      continue;
    }

    participant.completedAssessmentCount += 1;
    activityDates.set(result.participantId, [
      ...(activityDates.get(result.participantId) ?? []),
      result.submittedAt,
    ]);
  }

  return [...byParticipant.values()].map((participant) => ({
    ...participant,
    latestActivityAt: latestIso(activityDates.get(participant.id) ?? []),
  }));
}

export async function getClientParticipantDetail(
  clientId: string,
  participantId: string,
): Promise<ParticipantDetailDto | null> {
  const db = getDb();
  const [participantRow] = await db
    .select({
      id: participants.id,
      name: participants.name,
      email: participants.email,
      employeeId: participants.employeeId,
      externalReference: participants.externalReference,
      metadata: participants.metadata,
      status: participants.status,
      createdAt: participants.createdAt,
      updatedAt: participants.updatedAt,
    })
    .from(participants)
    .where(
      and(
        eq(participants.clientId, clientId),
        eq(participants.id, participantId),
        ne(participants.status, "anonymized"),
        isNull(participants.deletedAt),
      ),
    )
    .limit(1);

  if (!participantRow) {
    return null;
  }

  const [tokenRows, resultRows] = await Promise.all([
    db
      .select({
        tokenId: participantTokens.id,
        tokenPreview: participantTokens.tokenPreview,
        participantReference: participantTokens.participantReference,
        tokenStatus: participantTokens.status,
        expiresAt: participantTokens.expiresAt,
        startedAt: participantTokens.startedAt,
        completedAt: participantTokens.completedAt,
        lastActivityAt: participantTokens.lastActivityAt,
        tokenCreatedAt: participantTokens.createdAt,
        testKey: tests.testKey,
        testName: tests.displayName,
      })
      .from(participantTokens)
      .innerJoin(
        tests,
        and(
          eq(tests.id, participantTokens.testId),
          eq(tests.clientId, participantTokens.clientId),
        ),
      )
      .where(
        and(
          eq(participantTokens.clientId, clientId),
          eq(participantTokens.participantId, participantId),
        ),
      )
      .orderBy(desc(participantTokens.createdAt)),
    db
      .select({
        id: results.id,
        tokenId: results.tokenId,
        scoreSummary: results.scoreSummary,
        submittedAt: results.submittedAt,
        retentionUntil: results.retentionUntil,
        retentionStatus: results.retentionStatus,
      })
      .from(results)
      .where(
        and(
          eq(results.clientId, clientId),
          eq(results.participantId, participantId),
          ne(results.retentionStatus, "deleted"),
        ),
      ),
  ]);

  const resultsByTokenId = new Map(
    resultRows.map((result) => [
      result.tokenId,
      {
        id: result.id,
        resultLabel: resultLabel(result.scoreSummary),
        submittedAt: result.submittedAt.toISOString(),
        retentionUntil: result.retentionUntil.toISOString(),
        retentionStatus: result.retentionStatus,
      },
    ]),
  );
  const participant = mapParticipant(participantRow);
  const assessmentHistory = tokenRows.map((token) => ({
    tokenId: token.tokenId,
    tokenPreview: token.tokenPreview,
    participantReference: token.participantReference,
    testKey: token.testKey,
    testName: token.testName,
    tokenStatus: token.tokenStatus,
    tokenCreatedAt: token.tokenCreatedAt.toISOString(),
    expiresAt: token.expiresAt.toISOString(),
    startedAt: toIso(token.startedAt),
    completedAt: toIso(token.completedAt),
    lastActivityAt: toIso(token.lastActivityAt),
    result: resultsByTokenId.get(token.tokenId) ?? null,
  }));

  return {
    ...participant,
    tokenCount: tokenRows.length,
    completedAssessmentCount: resultRows.length,
    latestActivityAt: latestIso([
      ...tokenRows.flatMap((token) => [
        token.tokenCreatedAt,
        token.startedAt,
        token.lastActivityAt,
        token.completedAt,
      ]),
      ...resultRows.map((result) => result.submittedAt),
    ]),
    assessmentHistory,
  };
}

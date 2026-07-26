import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db/client";
import { participantTokens, participants, results, tests } from "@/db/schema";
import {
  getClientParticipantFieldDefinitions,
  participantCustomFieldValues,
  participantFieldDisplayValue,
  participantTags,
  type ParticipantCustomFieldValue,
  type ParticipantFieldDefinitionDto,
} from "@/services/participant-field-service";

type ParticipantStatus = "active" | "archived" | "anonymized";
type TokenStatus = "active" | "in_progress" | "completed" | "expired";
type RetentionStatus = "active" | "flagged_for_deletion" | "deleted";
type ResultSource = "platform_assessment" | "xlsx_import";

export interface ParticipantMetadataDto {
  tags?: string[];
  customFields?: Record<string, ParticipantCustomFieldValue>;
}

export interface ParticipantCustomFieldSummaryDto {
  fieldKey: string;
  label: string;
  value: string;
}

export interface ParticipantDirectoryItemDto {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  externalReference: string | null;
  metadata: ParticipantMetadataDto | null;
  customFieldSummary: ParticipantCustomFieldSummaryDto[];
  status: Exclude<ParticipantStatus, "anonymized">;
  createdAt: string;
  updatedAt: string;
  tokenCount: number;
  completedAssessmentCount: number;
  latestActivityAt: string | null;
  liveTestKeys: string[];
  liveAssessments: ParticipantLiveAssessmentDto[];
}

export interface ParticipantLiveAssessmentDto {
  tokenId: string;
  testKey: string;
  tokenStatus: Extract<TokenStatus, "active" | "in_progress">;
  expiresAt: string;
  canReissue: boolean;
  canCancel: boolean;
}

export interface ParticipantAssessmentHistoryDto {
  historyId: string;
  source: ResultSource;
  tokenId: string | null;
  tokenPreview: string | null;
  participantReference: string | null;
  importedFileName: string | null;
  testKey: string;
  testName: string;
  tokenStatus: TokenStatus | null;
  tokenCreatedAt: string | null;
  expiresAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  canReissue: boolean;
  canCancel: boolean;
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

export type ParticipantDirectoryStatusFilter = "all" | "active" | "archived";
export type ParticipantDirectoryActivityFilter =
  "all" | "live_access" | "has_results" | "no_results";
export type ParticipantDirectorySort = "recent" | "name";

export interface ParticipantDirectoryQuery {
  search: string;
  status: ParticipantDirectoryStatusFilter;
  activity: ParticipantDirectoryActivityFilter;
  sort: ParticipantDirectorySort;
  page: number;
}

export interface ParticipantDirectoryDto {
  participants: ParticipantDirectoryItemDto[];
  query: ParticipantDirectoryQuery;
  totalProfiles: number;
  filteredProfiles: number;
  assignedAssessments: number;
  completedAssessments: number;
  pageSize: number;
  pageCount: number;
}

const participantDirectoryPageSize = 25;

const participantSelection = {
  id: participants.id,
  name: participants.name,
  email: participants.email,
  employeeId: participants.employeeId,
  externalReference: participants.externalReference,
  metadata: participants.metadata,
  status: participants.status,
  createdAt: participants.createdAt,
  updatedAt: participants.updatedAt,
};

type ParticipantRow = {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  externalReference: string | null;
  metadata: Record<string, unknown> | null;
  status: ParticipantStatus;
  createdAt: Date;
  updatedAt: Date;
};

function toIso(date: Date | null) {
  return date ? date.toISOString() : null;
}

function resultLabel(scoreSummary: Record<string, unknown> | null) {
  const type = scoreSummary?.type;
  if (typeof type === "string") {
    return type;
  }

  const label = scoreSummary?.label;
  return typeof label === "string" ? label : "Result available";
}

function metadataDto(
  metadata: Record<string, unknown> | null,
  definitions: ParticipantFieldDefinitionDto[],
): ParticipantMetadataDto | null {
  const tags = participantTags(metadata);
  const customFields = participantCustomFieldValues(metadata, definitions);
  const dto: ParticipantMetadataDto = {
    tags: tags.length ? tags : undefined,
    customFields: Object.keys(customFields).length ? customFields : undefined,
  };

  return Object.values(dto).some(Boolean) ? dto : null;
}

function latestIso(dates: (Date | null)[]) {
  const latest = dates
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return toIso(latest ?? null);
}

function mapParticipant(
  row: ParticipantRow,
  definitions: ParticipantFieldDefinitionDto[],
): ParticipantDirectoryItemDto {
  const metadata = metadataDto(row.metadata, definitions);
  const customFieldSummary = definitions
    .filter((field) => field.isActive && !field.isSensitive)
    .flatMap((field) => {
      const value = participantFieldDisplayValue(
        metadata?.customFields?.[field.fieldKey],
      );
      return value
        ? [{ fieldKey: field.fieldKey, label: field.label, value }]
        : [];
    })
    .slice(0, 3);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    employeeId: row.employeeId,
    externalReference: row.externalReference,
    metadata,
    customFieldSummary,
    status: row.status === "archived" ? "archived" : "active",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tokenCount: 0,
    completedAssessmentCount: 0,
    latestActivityAt: null,
    liveTestKeys: [],
    liveAssessments: [],
  };
}

async function hydrateParticipantRows(
  clientId: string,
  participantRows: ParticipantRow[],
  definitions: ParticipantFieldDefinitionDto[],
): Promise<ParticipantDirectoryItemDto[]> {
  const db = getDb();
  if (!participantRows.length) {
    return [];
  }

  const participantIds = participantRows.map((row) => row.id);
  const [tokenRows, resultRows] = await Promise.all([
    db
      .select({
        tokenId: participantTokens.id,
        participantId: participantTokens.participantId,
        testKey: participantTokens.testKey,
        status: participantTokens.status,
        expiresAt: participantTokens.expiresAt,
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
    participantRows.map((row) => [row.id, mapParticipant(row, definitions)]),
  );
  const activityDates = new Map<string, (Date | null)[]>();
  const now = Date.now();

  for (const token of tokenRows) {
    if (!token.participantId) {
      continue;
    }

    const participant = byParticipant.get(token.participantId);

    if (!participant) {
      continue;
    }

    participant.tokenCount += 1;

    if (
      (token.status === "active" || token.status === "in_progress") &&
      token.expiresAt.getTime() > now &&
      !token.completedAt
    ) {
      if (!participant.liveTestKeys.includes(token.testKey)) {
        participant.liveTestKeys.push(token.testKey);
      }

      participant.liveAssessments.push({
        tokenId: token.tokenId,
        testKey: token.testKey,
        tokenStatus: token.status,
        expiresAt: token.expiresAt.toISOString(),
        canReissue: participant.status === "active",
        canCancel: true,
      });
    }

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

function participantBaseConditions(clientId: string) {
  return [
    eq(participants.clientId, clientId),
    ne(participants.status, "anonymized"),
    isNull(participants.deletedAt),
  ];
}

function participantDirectoryConditions(
  clientId: string,
  query: ParticipantDirectoryQuery,
  definitions: ParticipantFieldDefinitionDto[],
) {
  const conditions = participantBaseConditions(clientId);

  if (query.search) {
    const escapedSearch = query.search.replace(/[\\%_]/g, "\\$&");
    const pattern = `%${escapedSearch}%`;
    const searchableCustomFields = definitions.filter(
      (field) => field.isActive && field.isSearchable && !field.isSensitive,
    );
    const searchableConditions = [
      ilike(participants.name, pattern),
      ilike(participants.email, pattern),
      ilike(participants.employeeId, pattern),
      ilike(participants.externalReference, pattern),
      sql<boolean>`coalesce(${participants.metadata}->'tags', '[]'::jsonb)::text ilike ${pattern}`,
      ...searchableCustomFields.map(
        (field) =>
          sql<boolean>`coalesce(${participants.metadata}->'customFields'->>${field.fieldKey}, ${participants.metadata}->>${field.fieldKey}, '') ilike ${pattern}`,
      ),
    ];
    conditions.push(or(...searchableConditions)!);
  }

  if (query.status !== "all") {
    conditions.push(eq(participants.status, query.status));
  }

  const hasResults = sql<boolean>`exists (
    select 1
    from results directory_results
    where directory_results.client_id = ${clientId}
      and directory_results.participant_id = ${participants.id}
      and directory_results.retention_status <> 'deleted'
  )`;

  if (query.activity === "live_access") {
    conditions.push(sql<boolean>`exists (
      select 1
      from participant_tokens directory_tokens
      where directory_tokens.client_id = ${clientId}
        and directory_tokens.participant_id = ${participants.id}
        and directory_tokens.status in ('active', 'in_progress')
        and directory_tokens.expires_at > now()
        and directory_tokens.completed_at is null
    )`);
  } else if (query.activity === "has_results") {
    conditions.push(hasResults);
  } else if (query.activity === "no_results") {
    conditions.push(sql<boolean>`not (${hasResults})`);
  }

  return conditions;
}

export async function getClientParticipants(
  clientId: string,
): Promise<ParticipantDirectoryItemDto[]> {
  const db = getDb();
  const [participantRows, definitions] = await Promise.all([
    db
      .select(participantSelection)
      .from(participants)
      .where(and(...participantBaseConditions(clientId)))
      .orderBy(desc(participants.updatedAt), desc(participants.createdAt)),
    getClientParticipantFieldDefinitions(clientId, { includeInactive: true }),
  ]);

  return hydrateParticipantRows(clientId, participantRows, definitions);
}

export async function getClientParticipantDirectory(
  clientId: string,
  requestedQuery: ParticipantDirectoryQuery,
): Promise<ParticipantDirectoryDto> {
  const db = getDb();
  const definitions = await getClientParticipantFieldDefinitions(clientId);
  const baseConditions = participantBaseConditions(clientId);
  const filteredConditions = participantDirectoryConditions(
    clientId,
    requestedQuery,
    definitions,
  );

  const [profileCountRows, filteredCountRows, assignedRows, completedRows] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(participants)
        .where(and(...baseConditions)),
      db
        .select({ total: count() })
        .from(participants)
        .where(and(...filteredConditions)),
      db
        .select({ total: count() })
        .from(participantTokens)
        .innerJoin(
          participants,
          and(
            eq(participants.id, participantTokens.participantId),
            eq(participants.clientId, participantTokens.clientId),
          ),
        )
        .where(and(...baseConditions)),
      db
        .select({ total: count() })
        .from(results)
        .innerJoin(
          participants,
          and(
            eq(participants.id, results.participantId),
            eq(participants.clientId, results.clientId),
          ),
        )
        .where(and(...baseConditions, ne(results.retentionStatus, "deleted"))),
    ]);

  const totalProfiles = profileCountRows[0]?.total ?? 0;
  const filteredProfiles = filteredCountRows[0]?.total ?? 0;
  const pageCount = Math.max(
    Math.ceil(filteredProfiles / participantDirectoryPageSize),
    1,
  );
  const page = Math.min(Math.max(requestedQuery.page, 1), pageCount);
  const ordering =
    requestedQuery.sort === "name"
      ? [asc(participants.name), asc(participants.id)]
      : [desc(participants.updatedAt), desc(participants.createdAt)];
  const participantRows = await db
    .select(participantSelection)
    .from(participants)
    .where(and(...filteredConditions))
    .orderBy(...ordering)
    .limit(participantDirectoryPageSize)
    .offset((page - 1) * participantDirectoryPageSize);

  return {
    participants: await hydrateParticipantRows(
      clientId,
      participantRows,
      definitions,
    ),
    query: { ...requestedQuery, page },
    totalProfiles,
    filteredProfiles,
    assignedAssessments: assignedRows[0]?.total ?? 0,
    completedAssessments: completedRows[0]?.total ?? 0,
    pageSize: participantDirectoryPageSize,
    pageCount,
  };
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

  const [tokenRows, resultRows, definitions] = await Promise.all([
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
        source: results.source,
        importedAt: results.importedAt,
        importedFileName: results.importedFileName,
        testKey: tests.testKey,
        testName: tests.displayName,
        scoreSummary: results.scoreSummary,
        submittedAt: results.submittedAt,
        retentionUntil: results.retentionUntil,
        retentionStatus: results.retentionStatus,
      })
      .from(results)
      .innerJoin(
        tests,
        and(eq(tests.id, results.testId), eq(tests.clientId, results.clientId)),
      )
      .where(
        and(
          eq(results.clientId, clientId),
          eq(results.participantId, participantId),
          ne(results.retentionStatus, "deleted"),
        ),
      ),
    getClientParticipantFieldDefinitions(clientId, { includeInactive: true }),
  ]);

  const resultDto = (result: (typeof resultRows)[number]) => ({
    id: result.id,
    resultLabel: resultLabel(result.scoreSummary),
    submittedAt: result.submittedAt.toISOString(),
    retentionUntil: result.retentionUntil.toISOString(),
    retentionStatus: result.retentionStatus,
  });
  const resultsByTokenId = new Map(
    resultRows.flatMap((result) =>
      result.tokenId ? [[result.tokenId, resultDto(result)] as const] : [],
    ),
  );
  const participant = mapParticipant(participantRow, definitions);
  const now = Date.now();
  const tokenHistory: ParticipantAssessmentHistoryDto[] = tokenRows.map(
    (token) => {
      const isLive =
        (token.tokenStatus === "active" ||
          token.tokenStatus === "in_progress") &&
        token.expiresAt.getTime() > now &&
        !token.completedAt;

      const result = resultsByTokenId.get(token.tokenId) ?? null;

      return {
        historyId: `token:${token.tokenId}`,
        source: "platform_assessment",
        tokenId: token.tokenId,
        tokenPreview: token.tokenPreview,
        participantReference: token.participantReference,
        importedFileName: null,
        testKey: token.testKey,
        testName: token.testName,
        tokenStatus: token.tokenStatus,
        tokenCreatedAt: token.tokenCreatedAt.toISOString(),
        expiresAt: token.expiresAt.toISOString(),
        startedAt: toIso(token.startedAt),
        completedAt: toIso(token.completedAt),
        lastActivityAt: toIso(token.lastActivityAt),
        canReissue: isLive && participant.status === "active",
        canCancel: isLive,
        result,
      };
    },
  );
  const importedHistory: ParticipantAssessmentHistoryDto[] = resultRows
    .filter(
      (result) => result.source === "xlsx_import" && result.tokenId === null,
    )
    .map((result) => ({
      historyId: `result:${result.id}`,
      source: "xlsx_import",
      tokenId: null,
      tokenPreview: null,
      participantReference: null,
      importedFileName: result.importedFileName,
      testKey: result.testKey,
      testName: result.testName,
      tokenStatus: null,
      tokenCreatedAt: null,
      expiresAt: null,
      startedAt: null,
      completedAt: result.submittedAt.toISOString(),
      lastActivityAt: result.importedAt?.toISOString() ?? null,
      canReissue: false,
      canCancel: false,
      result: resultDto(result),
    }));
  const assessmentHistory = [...tokenHistory, ...importedHistory].sort(
    (left, right) =>
      new Date(
        right.result?.submittedAt ?? right.tokenCreatedAt ?? 0,
      ).getTime() -
      new Date(left.result?.submittedAt ?? left.tokenCreatedAt ?? 0).getTime(),
  );

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

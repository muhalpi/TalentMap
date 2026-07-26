import { and, desc, eq, gt, inArray, isNull, ne } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  clientTestQuotas,
  clientUsers,
  clients,
  participantAnonymizationAudits,
  participantConsents,
  participants,
  participantTokens,
  results,
  tests,
} from "@/db/schema";
import { generateClientParticipantAccess } from "@/services/token-service";
import {
  getTestDefinition,
  isCurrentImplementedTest,
  testCatalog,
} from "@/tests/registry";
import type { TestKey } from "@/tests/shared/types";
import { mergeAccessLedgerRows } from "@/services/access-ledger";

const DEFAULT_DEMO_CLIENT_SLUG = "northstar-advisory";
type ParticipantStatus = "active" | "archived" | "anonymized";
export type ResultSource = "platform_assessment" | "xlsx_import";

export interface DashboardQuotaDto {
  testId: string;
  testKey: string;
  testName: string;
  version: string;
  quotaTotal: number;
  quotaUsed: number;
  quotaReserved: number;
  quotaConsumed: number;
  quotaAvailable: number;
  quotaExpiresAt: string | null;
  isEnabled: boolean;
  implemented: boolean;
}

export interface DashboardTokenDto {
  id: string;
  testKey: string;
  testName: string;
  participantId: string | null;
  participantName: string | null;
  participantEmail: string | null;
  participantEmployeeId: string | null;
  tokenPreview: string | null;
  participantReference: string | null;
  status: "active" | "in_progress" | "completed" | "expired";
  expiresAt: string;
  createdAt: string;
  canReissue: boolean;
  canCancel: boolean;
}

export interface DashboardResultDto {
  id: string;
  testKey: string;
  testName: string;
  participant: {
    id: string | null;
    name: string;
    email: string | null;
    employeeId: string | null;
    status: ParticipantStatus;
    profileHref: string | null;
  } | null;
  participantReference: string | null;
  source: ResultSource;
  importedAt: string | null;
  importedFileName: string | null;
  resultLabel: string;
  submittedAt: string;
  retentionUntil: string;
  retentionStatus: "active" | "flagged_for_deletion" | "deleted";
}

export interface DashboardResultDetailDto extends DashboardResultDto {
  tokenId: string | null;
  tokenPreview: string | null;
  importedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  testVersion: string;
  rawAnswers: Record<string, string>;
  questionTimings: Record<string, number>;
  durationSeconds: number;
  scoredResult: Record<string, unknown>;
  scoreSummary: Record<string, unknown> | null;
  interpretation: Record<string, unknown> | null;
}

export interface ClientDashboardDto {
  client: {
    clientId: string;
    name: string;
    slug: string;
    status: "active" | "suspended" | "expired";
    contractEndsAt: string;
  };
  stats: {
    testsUnlocked: number;
    quotaTotal: number;
    quotaUsed: number;
    quotaReserved: number;
    quotaConsumed: number;
    activeTokens: number;
    inProgressTokens: number;
    completedTokens: number;
  };
  quotas: DashboardQuotaDto[];
  accessTokens: DashboardTokenDto[];
  recentResults: DashboardResultDto[];
}

export interface DashboardTrendPointDto {
  date: string;
  issued: number;
  completed: number;
  inProgress: number;
  expired: number;
  participants: number;
}

export interface DashboardAssessmentMetricDto {
  testId: string;
  testName: string;
  issued: number;
  completed: number;
  completionRate: number;
}

export interface DashboardResultDistributionDto {
  label: string;
  value: number;
}

export type DashboardActivityKind =
  | "assessment"
  | "participant"
  | "token"
  | "consent"
  | "privacy";

export interface DashboardActivityDto {
  id: string;
  kind: DashboardActivityKind;
  title: string;
  description: string;
  occurredAt: string;
}

export interface DashboardAnalyticsDto {
  participantsTotal: number;
  assessmentsTotal: number;
  completedTotal: number;
  inProgressTotal: number;
  expiredTotal: number;
  completionRate: number;
  resultsTotal: number;
  trend: DashboardTrendPointDto[];
  assessments: DashboardAssessmentMetricDto[];
  resultDistribution: DashboardResultDistributionDto[];
  recentActivity: DashboardActivityDto[];
  compliance: {
    consentsRecorded: number;
    consentCoverage: number;
    retentionCompliant: boolean;
    retainedResults: number;
    erasureRequests: number;
  };
  nextTokenExpiryAt: string | null;
}

export interface AdminClientDto {
  clientId: string;
  name: string;
  slug: string;
  status: "active" | "suspended" | "expired";
  contractEndsAt: string;
  quotaLabel: string;
  testsUnlocked: number;
}

export interface AdminProvisioningDto {
  clients: AdminClientDto[];
  stats: {
    totalClients: number;
    activeClients: number;
    testsUnlocked: number;
    quotaAllocated: number;
  };
}

export interface AdminClientTestProvisioningDto {
  testKey: string;
  testName: string;
  version: string;
  description: string;
  estimatedMinutes: number;
  implemented: boolean;
  entitlement: DashboardQuotaDto | null;
}

export interface AdminClientDetailDto {
  client: ClientDashboardDto["client"] & {
    contractStartsAt: string;
    createdAt: string;
    updatedAt: string;
  };
  stats: ClientDashboardDto["stats"] & {
    expiredTokens: number;
    quotaAvailable: number;
    resultCount: number;
  };
  quotas: DashboardQuotaDto[];
  testProvisioning: AdminClientTestProvisioningDto[];
  accessTokens: DashboardTokenDto[];
  recentResults: DashboardResultDto[];
}

function toIso(date: Date | null) {
  return date ? date.toISOString() : null;
}

function resultLabel(scoreSummary: Record<string, unknown> | null) {
  const label = scoreSummary?.label;

  if (typeof label === "string" && label.trim()) {
    return label;
  }

  const type = scoreSummary?.type;
  return typeof type === "string" ? type : "Pending";
}

interface TokenActionCandidate {
  participantId: string | null;
  participantReference: string | null;
  participantStatus: ParticipantStatus | null;
  participantDeletedAt: Date | null;
  status: DashboardTokenDto["status"];
  expiresAt: Date;
  completedAt: Date | null;
}

function isLiveToken(token: TokenActionCandidate, now: Date) {
  if (
    (token.status !== "active" && token.status !== "in_progress") ||
    token.completedAt ||
    token.expiresAt.getTime() <= now.getTime()
  ) {
    return false;
  }

  return true;
}

function canReissueToken(token: TokenActionCandidate, now: Date) {
  if (!isLiveToken(token, now)) {
    return false;
  }

  if (token.participantId) {
    return token.participantStatus === "active" && !token.participantDeletedAt;
  }

  return Boolean(token.participantReference);
}

const dashboardTokenSelection = {
  id: participantTokens.id,
  testKey: tests.testKey,
  testName: tests.displayName,
  participantId: participantTokens.participantId,
  participantName: participants.name,
  participantEmail: participants.email,
  participantEmployeeId: participants.employeeId,
  participantStatus: participants.status,
  participantDeletedAt: participants.deletedAt,
  tokenPreview: participantTokens.tokenPreview,
  participantReference: participantTokens.participantReference,
  status: participantTokens.status,
  expiresAt: participantTokens.expiresAt,
  startedAt: participantTokens.startedAt,
  completedAt: participantTokens.completedAt,
  createdAt: participantTokens.createdAt,
};

function mapResultParticipant(row: {
  participantId: string | null;
  participantName: string | null;
  participantEmail: string | null;
  participantEmployeeId: string | null;
  participantStatus: ParticipantStatus | null;
  participantDeletedAt: Date | null;
}) {
  if (!row.participantId || !row.participantName || !row.participantStatus) {
    return null;
  }

  if (row.participantStatus === "anonymized") {
    return {
      id: null,
      name: "Anonymized participant",
      email: null,
      employeeId: null,
      status: row.participantStatus,
      profileHref: null,
    };
  }

  return {
    id: row.participantId,
    name: row.participantName,
    email: row.participantEmail,
    employeeId: row.participantEmployeeId,
    status: row.participantStatus,
    profileHref: row.participantDeletedAt
      ? null
      : `/dashboard/participants/${row.participantId}`,
  };
}

function mapResultSummary(row: {
  id: string;
  testKey: string;
  testName: string;
  participantId: string | null;
  participantName: string | null;
  participantEmail: string | null;
  participantEmployeeId: string | null;
  participantStatus: ParticipantStatus | null;
  participantDeletedAt: Date | null;
  participantReference: string | null;
  source: ResultSource;
  importedAt: Date | null;
  importedFileName: string | null;
  scoreSummary: Record<string, unknown> | null;
  submittedAt: Date;
  retentionUntil: Date;
  retentionStatus: "active" | "flagged_for_deletion" | "deleted";
}): DashboardResultDto {
  return {
    id: row.id,
    testKey: row.testKey,
    testName: row.testName,
    participant: mapResultParticipant(row),
    participantReference: row.participantReference,
    source: row.source,
    importedAt: toIso(row.importedAt),
    importedFileName: row.importedFileName,
    resultLabel: resultLabel(row.scoreSummary),
    submittedAt: row.submittedAt.toISOString(),
    retentionUntil: row.retentionUntil.toISOString(),
    retentionStatus: row.retentionStatus,
  };
}

function mapResultDetail(row: {
  id: string;
  tokenId: string | null;
  tokenPreview: string | null;
  importedById: string | null;
  importedByName: string | null;
  importedByEmail: string | null;
  testKey: string;
  testName: string;
  testVersion: string;
  participantId: string | null;
  participantName: string | null;
  participantEmail: string | null;
  participantEmployeeId: string | null;
  participantStatus: ParticipantStatus | null;
  participantDeletedAt: Date | null;
  participantReference: string | null;
  source: ResultSource;
  importedAt: Date | null;
  importedFileName: string | null;
  rawAnswers: Record<string, string>;
  questionTimings: Record<string, number>;
  durationSeconds: number;
  scoredResult: Record<string, unknown>;
  scoreSummary: Record<string, unknown> | null;
  interpretation: Record<string, unknown> | null;
  submittedAt: Date;
  retentionUntil: Date;
  retentionStatus: "active" | "flagged_for_deletion" | "deleted";
}): DashboardResultDetailDto {
  return {
    ...mapResultSummary(row),
    tokenId: row.tokenId,
    tokenPreview: row.tokenPreview,
    importedBy:
      row.importedById && row.importedByEmail
        ? {
            id: row.importedById,
            name: row.importedByName,
            email: row.importedByEmail,
          }
        : null,
    testVersion: row.testVersion,
    rawAnswers: row.rawAnswers,
    questionTimings: row.questionTimings,
    durationSeconds: row.durationSeconds,
    scoredResult: row.scoredResult,
    scoreSummary: row.scoreSummary,
    interpretation: row.interpretation,
  };
}

function demoSlug() {
  return process.env.DEMO_CLIENT_SLUG ?? DEFAULT_DEMO_CLIENT_SLUG;
}

export async function getClientResults(
  clientId: string,
): Promise<DashboardResultDto[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: results.id,
      testKey: tests.testKey,
      testName: tests.displayName,
      participantId: participants.id,
      participantName: participants.name,
      participantEmail: participants.email,
      participantEmployeeId: participants.employeeId,
      participantStatus: participants.status,
      participantDeletedAt: participants.deletedAt,
      participantReference: participantTokens.participantReference,
      source: results.source,
      importedAt: results.importedAt,
      importedFileName: results.importedFileName,
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
    .leftJoin(
      participantTokens,
      and(
        eq(participantTokens.id, results.tokenId),
        eq(participantTokens.clientId, results.clientId),
      ),
    )
    .leftJoin(
      participants,
      and(
        eq(participants.id, results.participantId),
        eq(participants.clientId, results.clientId),
      ),
    )
    .where(
      and(
        eq(results.clientId, clientId),
        ne(results.retentionStatus, "deleted"),
      ),
    )
    .orderBy(desc(results.submittedAt));

  return rows.map(mapResultSummary);
}

export async function getClientResultDetail(
  clientId: string,
  resultId: string,
): Promise<DashboardResultDetailDto | null> {
  const rows = await getClientResultExportRows({ clientId, resultId });
  return rows[0] ?? null;
}

export async function getClientResultExportRows(input: {
  clientId: string;
  resultId?: string;
}): Promise<DashboardResultDetailDto[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: results.id,
      tokenId: results.tokenId,
      tokenPreview: participantTokens.tokenPreview,
      importedById: clientUsers.id,
      importedByName: clientUsers.name,
      importedByEmail: clientUsers.email,
      testKey: tests.testKey,
      testName: tests.displayName,
      testVersion: tests.version,
      participantId: participants.id,
      participantName: participants.name,
      participantEmail: participants.email,
      participantEmployeeId: participants.employeeId,
      participantStatus: participants.status,
      participantDeletedAt: participants.deletedAt,
      participantReference: participantTokens.participantReference,
      source: results.source,
      importedAt: results.importedAt,
      importedFileName: results.importedFileName,
      rawAnswers: results.rawAnswers,
      questionTimings: results.questionTimings,
      durationSeconds: results.durationSeconds,
      scoredResult: results.scoredResult,
      scoreSummary: results.scoreSummary,
      interpretation: results.interpretation,
      submittedAt: results.submittedAt,
      retentionUntil: results.retentionUntil,
      retentionStatus: results.retentionStatus,
    })
    .from(results)
    .innerJoin(
      tests,
      and(eq(tests.id, results.testId), eq(tests.clientId, results.clientId)),
    )
    .leftJoin(
      participantTokens,
      and(
        eq(participantTokens.id, results.tokenId),
        eq(participantTokens.clientId, results.clientId),
      ),
    )
    .leftJoin(
      participants,
      and(
        eq(participants.id, results.participantId),
        eq(participants.clientId, results.clientId),
      ),
    )
    .leftJoin(
      clientUsers,
      and(
        eq(clientUsers.id, results.importedByClientUserId),
        eq(clientUsers.clientId, results.clientId),
      ),
    )
    .where(
      input.resultId
        ? and(
            eq(results.clientId, input.clientId),
            eq(results.id, input.resultId),
            ne(results.retentionStatus, "deleted"),
          )
        : and(
            eq(results.clientId, input.clientId),
            ne(results.retentionStatus, "deleted"),
          ),
    )
    .orderBy(desc(results.submittedAt));

  return rows.map(mapResultDetail);
}

export async function getClientDashboardBySlug(
  slug = demoSlug(),
): Promise<ClientDashboardDto | null> {
  const db = getDb();
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.slug, slug))
    .limit(1);

  if (!client) {
    return null;
  }

  const now = new Date();

  const quotaRows = await db
    .select({
      testId: tests.id,
      testKey: tests.testKey,
      testName: tests.displayName,
      version: tests.version,
      isEnabled: tests.isEnabled,
      quotaTotal: clientTestQuotas.quotaTotal,
      quotaReserved: clientTestQuotas.quotaReserved,
      quotaConsumed: clientTestQuotas.quotaConsumed,
      quotaExpiresAt: clientTestQuotas.quotaExpiresAt,
    })
    .from(clientTestQuotas)
    .innerJoin(
      tests,
      and(
        eq(tests.id, clientTestQuotas.testId),
        eq(tests.clientId, clientTestQuotas.clientId),
      ),
    )
    .where(eq(clientTestQuotas.clientId, client.clientId))
    .orderBy(tests.displayName);

  const recentTokenRows = await db
    .select(dashboardTokenSelection)
    .from(participantTokens)
    .innerJoin(
      tests,
      and(
        eq(tests.id, participantTokens.testId),
        eq(tests.clientId, participantTokens.clientId),
      ),
    )
    .leftJoin(
      participants,
      and(
        eq(participants.id, participantTokens.participantId),
        eq(participants.clientId, participantTokens.clientId),
      ),
    )
    .where(eq(participantTokens.clientId, client.clientId))
    .orderBy(desc(participantTokens.createdAt))
    .limit(8);

  const liveTokenRows = await db
    .select(dashboardTokenSelection)
    .from(participantTokens)
    .innerJoin(
      tests,
      and(
        eq(tests.id, participantTokens.testId),
        eq(tests.clientId, participantTokens.clientId),
      ),
    )
    .leftJoin(
      participants,
      and(
        eq(participants.id, participantTokens.participantId),
        eq(participants.clientId, participantTokens.clientId),
      ),
    )
    .where(
      and(
        eq(participantTokens.clientId, client.clientId),
        inArray(participantTokens.status, ["active", "in_progress"]),
        gt(participantTokens.expiresAt, now),
        isNull(participantTokens.completedAt),
      ),
    )
    .orderBy(desc(participantTokens.createdAt));

  const accessTokenRows = mergeAccessLedgerRows(
    liveTokenRows,
    recentTokenRows,
  );

  const tokenStatusRows = await db
    .select({
      status: participantTokens.status,
    })
    .from(participantTokens)
    .where(eq(participantTokens.clientId, client.clientId));

  const resultRows = await db
    .select({
      id: results.id,
      testKey: tests.testKey,
      testName: tests.displayName,
      participantId: participants.id,
      participantName: participants.name,
      participantEmail: participants.email,
      participantEmployeeId: participants.employeeId,
      participantStatus: participants.status,
      participantDeletedAt: participants.deletedAt,
      participantReference: participantTokens.participantReference,
      source: results.source,
      importedAt: results.importedAt,
      importedFileName: results.importedFileName,
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
    .leftJoin(
      participantTokens,
      and(
        eq(participantTokens.id, results.tokenId),
        eq(participantTokens.clientId, results.clientId),
      ),
    )
    .leftJoin(
      participants,
      and(
        eq(participants.id, results.participantId),
        eq(participants.clientId, results.clientId),
      ),
    )
    .where(
      and(
        eq(results.clientId, client.clientId),
        ne(results.retentionStatus, "deleted"),
      ),
    )
    .orderBy(desc(results.submittedAt))
    .limit(8);

  const tokenCounts = tokenStatusRows.reduce(
    (acc, token) => {
      acc[token.status] += 1;
      return acc;
    },
    {
      active: 0,
      in_progress: 0,
      completed: 0,
      expired: 0,
    },
  );

  const quotas = quotaRows.map((quota) => {
    const quotaUsed = quota.quotaReserved + quota.quotaConsumed;

    return {
      testId: quota.testId,
      testKey: quota.testKey,
      testName: quota.testName,
      version: quota.version,
      quotaTotal: quota.quotaTotal,
      quotaUsed,
      quotaReserved: quota.quotaReserved,
      quotaConsumed: quota.quotaConsumed,
      quotaAvailable: Math.max(quota.quotaTotal - quotaUsed, 0),
      quotaExpiresAt: toIso(quota.quotaExpiresAt),
      isEnabled: quota.isEnabled,
      implemented: isCurrentImplementedTest(quota.testKey, quota.version),
    };
  });

  return {
    client: {
      clientId: client.clientId,
      name: client.name,
      slug: client.slug,
      status: client.status,
      contractEndsAt: client.contractEndsAt.toISOString(),
    },
    stats: {
      testsUnlocked: quotas.length,
      quotaTotal: quotas.reduce((sum, quota) => sum + quota.quotaTotal, 0),
      quotaUsed: quotas.reduce((sum, quota) => sum + quota.quotaUsed, 0),
      quotaReserved: quotas.reduce(
        (sum, quota) => sum + quota.quotaReserved,
        0,
      ),
      quotaConsumed: quotas.reduce(
        (sum, quota) => sum + quota.quotaConsumed,
        0,
      ),
      activeTokens: tokenCounts.active,
      inProgressTokens: tokenCounts.in_progress,
      completedTokens: tokenCounts.completed,
    },
    quotas,
    accessTokens: accessTokenRows.map((token) => ({
      id: token.id,
      testKey: token.testKey,
      testName: token.testName,
      participantId: token.participantId,
      participantName: token.participantName,
      participantEmail: token.participantEmail,
      participantEmployeeId: token.participantEmployeeId,
      tokenPreview: token.tokenPreview,
      participantReference: token.participantReference,
      status: token.status,
      expiresAt: token.expiresAt.toISOString(),
      createdAt: token.createdAt.toISOString(),
      canReissue: canReissueToken(token, now),
      canCancel: isLiveToken(token, now),
    })),
    recentResults: resultRows.map(mapResultSummary),
  };
}

export async function getClientDashboardByClientId(
  clientId: string,
): Promise<ClientDashboardDto | null> {
  const db = getDb();
  const [client] = await db
    .select({ slug: clients.slug })
    .from(clients)
    .where(eq(clients.clientId, clientId))
    .limit(1);

  if (!client) {
    return null;
  }

  return getClientDashboardBySlug(client.slug);
}

export async function getClientDashboardAnalytics(
  clientId: string,
): Promise<DashboardAnalyticsDto> {
  const db = getDb();
  const [participantRows, tokenRows, resultRows, consentRows, auditRows] =
    await Promise.all([
      db
        .select({
          id: participants.id,
          name: participants.name,
          status: participants.status,
          createdAt: participants.createdAt,
        })
        .from(participants)
        .where(eq(participants.clientId, clientId)),
      db
        .select({
          id: participantTokens.id,
          testId: participantTokens.testId,
          testName: tests.displayName,
          participantName: participants.name,
          participantReference: participantTokens.participantReference,
          status: participantTokens.status,
          createdAt: participantTokens.createdAt,
          startedAt: participantTokens.startedAt,
          completedAt: participantTokens.completedAt,
          expiresAt: participantTokens.expiresAt,
        })
        .from(participantTokens)
        .innerJoin(
          tests,
          and(
            eq(tests.id, participantTokens.testId),
            eq(tests.clientId, participantTokens.clientId),
          ),
        )
        .leftJoin(
          participants,
          and(
            eq(participants.id, participantTokens.participantId),
            eq(participants.clientId, participantTokens.clientId),
          ),
        )
        .where(eq(participantTokens.clientId, clientId)),
      db
        .select({
          id: results.id,
          testName: tests.displayName,
          participantName: participants.name,
          participantReference: participantTokens.participantReference,
          source: results.source,
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
        .leftJoin(
          participantTokens,
          and(
            eq(participantTokens.id, results.tokenId),
            eq(participantTokens.clientId, results.clientId),
          ),
        )
        .leftJoin(
          participants,
          and(
            eq(participants.id, results.participantId),
            eq(participants.clientId, results.clientId),
          ),
        )
        .where(eq(results.clientId, clientId)),
      db
        .select({
          id: participantConsents.id,
          participantName: participants.name,
          acceptedAt: participantConsents.acceptedAt,
        })
        .from(participantConsents)
        .leftJoin(
          participants,
          and(
            eq(participants.id, participantConsents.participantId),
            eq(participants.clientId, participantConsents.clientId),
          ),
        )
        .where(eq(participantConsents.clientId, clientId)),
      db
        .select({
          id: participantAnonymizationAudits.id,
          anonymizedLabel: participantAnonymizationAudits.anonymizedLabel,
          createdAt: participantAnonymizationAudits.createdAt,
        })
        .from(participantAnonymizationAudits)
        .where(eq(participantAnonymizationAudits.clientId, clientId)),
    ]);

  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
  );
  const trend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    return {
      date: date.toISOString().slice(0, 10),
      issued: tokenRows.filter((token) => token.createdAt <= dayEnd).length,
      completed: tokenRows.filter(
        (token) => token.completedAt && token.completedAt <= dayEnd,
      ).length,
      inProgress: tokenRows.filter(
        (token) =>
          token.startedAt &&
          token.startedAt <= dayEnd &&
          (!token.completedAt || token.completedAt > dayEnd) &&
          !(token.status === "expired" && token.expiresAt <= dayEnd),
      ).length,
      expired: tokenRows.filter(
        (token) => token.status === "expired" && token.expiresAt <= dayEnd,
      ).length,
      participants: participantRows.filter(
        (participant) => participant.createdAt <= dayEnd,
      ).length,
    };
  });

  const assessmentMap = new Map<
    string,
    DashboardAssessmentMetricDto
  >();

  for (const token of tokenRows) {
    const assessment = assessmentMap.get(token.testId) ?? {
      testId: token.testId,
      testName: token.testName,
      issued: 0,
      completed: 0,
      completionRate: 0,
    };

    assessment.issued += 1;
    if (token.status === "completed") {
      assessment.completed += 1;
    }
    assessmentMap.set(token.testId, assessment);
  }

  const assessmentMetrics = Array.from(assessmentMap.values())
    .map((assessment) => ({
      ...assessment,
      completionRate: assessment.issued
        ? Math.round((assessment.completed / assessment.issued) * 1000) / 10
        : 0,
    }))
    .sort((left, right) => right.issued - left.issued);

  const distributionMap = new Map<string, number>();
  for (const result of resultRows) {
    const label = resultLabel(result.scoreSummary);
    distributionMap.set(label, (distributionMap.get(label) ?? 0) + 1);
  }

  const resultDistribution = Array.from(distributionMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);

  const activities: DashboardActivityDto[] = [];

  for (const result of resultRows) {
    activities.push({
      id: `result-${result.id}`,
      kind: "assessment",
      title:
        result.source === "xlsx_import"
          ? "Assessment result imported"
          : "Assessment completed",
      description:
        result.source === "xlsx_import"
          ? `${result.participantName ?? "A participant"}'s ${result.testName} result was imported`
          : `${result.participantName ?? result.participantReference ?? "A participant"} completed ${result.testName}`,
      occurredAt: result.submittedAt.toISOString(),
    });
  }

  for (const participant of participantRows) {
    activities.push({
      id: `participant-${participant.id}`,
      kind: "participant",
      title: "Participant added",
      description:
        participant.status === "anonymized"
          ? "An anonymized participant record was added"
          : `${participant.name} joined the directory`,
      occurredAt: participant.createdAt.toISOString(),
    });
  }

  for (const token of tokenRows) {
    activities.push({
      id: `token-${token.id}`,
      kind: "token",
      title: "Token generated",
      description: `${token.testName} access created for ${token.participantName ?? token.participantReference ?? "a participant"}`,
      occurredAt: token.createdAt.toISOString(),
    });

    if (token.status === "expired") {
      activities.push({
        id: `token-expired-${token.id}`,
        kind: "token",
        title: "Token expired",
        description: `${token.testName} quota reservation was released`,
        occurredAt: token.expiresAt.toISOString(),
      });
    }
  }

  for (const consent of consentRows) {
    activities.push({
      id: `consent-${consent.id}`,
      kind: "consent",
      title: "Consent recorded",
      description: `${consent.participantName ?? "A participant"} accepted the assessment consent`,
      occurredAt: consent.acceptedAt.toISOString(),
    });
  }

  for (const audit of auditRows) {
    activities.push({
      id: `privacy-${audit.id}`,
      kind: "privacy",
      title: "Erasure request processed",
      description: `${audit.anonymizedLabel} was anonymized`,
      occurredAt: audit.createdAt.toISOString(),
    });
  }

  const completedTotal = tokenRows.filter(
    (token) => token.status === "completed",
  ).length;
  const inProgressTotal = tokenRows.filter(
    (token) => token.status === "in_progress",
  ).length;
  const expiredTotal = tokenRows.filter(
    (token) => token.status === "expired",
  ).length;
  const engagedTotal = tokenRows.filter(
    (token) => token.startedAt || token.completedAt,
  ).length;
  const retainedResults = resultRows.filter(
    (result) => result.retentionStatus !== "deleted",
  ).length;
  const nextTokenExpiry = tokenRows
    .filter((token) => token.status === "active" && token.expiresAt > now)
    .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime())[0];

  return {
    participantsTotal: participantRows.length,
    assessmentsTotal: tokenRows.length,
    completedTotal,
    inProgressTotal,
    expiredTotal,
    completionRate: tokenRows.length
      ? Math.round((completedTotal / tokenRows.length) * 1000) / 10
      : 0,
    resultsTotal: retainedResults,
    trend,
    assessments: assessmentMetrics,
    resultDistribution,
    recentActivity: activities
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, 6),
    compliance: {
      consentsRecorded: consentRows.length,
      consentCoverage: engagedTotal
        ? Math.min(100, Math.round((consentRows.length / engagedTotal) * 100))
        : 100,
      retentionCompliant: !resultRows.some(
        (result) =>
          result.retentionStatus === "active" && result.retentionUntil < now,
      ),
      retainedResults,
      erasureRequests: auditRows.length,
    },
    nextTokenExpiryAt: nextTokenExpiry?.expiresAt.toISOString() ?? null,
  };
}

export async function generateDashboardAccess(input: {
  clientId: string;
  testKey?: TestKey;
  participantId: string;
}) {
  const dashboard = await getClientDashboardByClientId(input.clientId);

  if (!dashboard) {
    throw new Error("Client dashboard context was not found.");
  }

  const testKey = input.testKey ?? "mbti";
  const definition = getTestDefinition(testKey);

  if (!definition?.implemented) {
    throw new Error(`${testKey} is not implemented for client delivery.`);
  }

  const quota = dashboard.quotas.find(
    (row) => row.testKey === testKey && row.isEnabled && row.implemented,
  );

  if (!quota) {
    throw new Error(`The client is not entitled to ${testKey}.`);
  }

  if (quota.quotaAvailable < 1) {
    throw new Error(`The client quota for ${testKey} is exhausted.`);
  }

  const db = getDb();
  const [clientUser] = await db
    .select()
    .from(clientUsers)
    .where(eq(clientUsers.clientId, dashboard.client.clientId))
    .limit(1);

  return generateClientParticipantAccess({
    clientId: input.clientId,
    testId: quota.testId,
    createdByClientUserId: clientUser?.id,
    participantId: input.participantId,
  });
}

export async function getAdminProvisioningOverview(): Promise<AdminProvisioningDto> {
  const db = getDb();
  const clientRows = await db.select().from(clients).orderBy(clients.name);

  const clientDtos: AdminClientDto[] = [];
  let testsUnlocked = 0;
  let quotaAllocated = 0;

  for (const client of clientRows) {
    const quotas = await db
      .select({
        testKey: tests.testKey,
        quotaTotal: clientTestQuotas.quotaTotal,
        quotaReserved: clientTestQuotas.quotaReserved,
        quotaConsumed: clientTestQuotas.quotaConsumed,
      })
      .from(clientTestQuotas)
      .innerJoin(
        tests,
        and(
          eq(tests.id, clientTestQuotas.testId),
          eq(tests.clientId, clientTestQuotas.clientId),
        ),
      )
      .where(eq(clientTestQuotas.clientId, client.clientId));

    const quotaTotal = quotas.reduce((sum, quota) => sum + quota.quotaTotal, 0);
    const quotaReserved = quotas.reduce(
      (sum, quota) => sum + quota.quotaReserved,
      0,
    );
    const quotaConsumed = quotas.reduce(
      (sum, quota) => sum + quota.quotaConsumed,
      0,
    );
    const quotaUsed = quotaReserved + quotaConsumed;

    testsUnlocked += quotas.length;
    quotaAllocated += quotaTotal;

    clientDtos.push({
      clientId: client.clientId,
      name: client.name,
      slug: client.slug,
      status: client.status,
      contractEndsAt: client.contractEndsAt.toISOString(),
      quotaLabel: quotas.length
        ? `${quotaUsed}/${quotaTotal} allocated`
        : "No quota assigned",
      testsUnlocked: quotas.length,
    });
  }

  return {
    clients: clientDtos,
    stats: {
      totalClients: clientDtos.length,
      activeClients: clientDtos.filter((client) => client.status === "active")
        .length,
      testsUnlocked,
      quotaAllocated,
    },
  };
}

export async function getAdminClientDetail(
  clientId: string,
): Promise<AdminClientDetailDto | null> {
  const db = getDb();
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.clientId, clientId))
    .limit(1);

  if (!client) {
    return null;
  }

  const dashboard = await getClientDashboardByClientId(client.clientId);

  if (!dashboard) {
    return null;
  }

  const tokenStatusRows = await db
    .select({
      status: participantTokens.status,
    })
    .from(participantTokens)
    .where(eq(participantTokens.clientId, client.clientId));

  const resultRows = await db
    .select({
      id: results.id,
    })
    .from(results)
    .where(
      and(
        eq(results.clientId, client.clientId),
        ne(results.retentionStatus, "deleted"),
      ),
    );

  const tokenCounts = tokenStatusRows.reduce(
    (acc, token) => {
      acc[token.status] += 1;
      return acc;
    },
    {
      active: 0,
      in_progress: 0,
      completed: 0,
      expired: 0,
    },
  );

  return {
    client: {
      ...dashboard.client,
      contractStartsAt: client.contractStartsAt.toISOString(),
      contractEndsAt: client.contractEndsAt.toISOString(),
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    },
    stats: {
      ...dashboard.stats,
      activeTokens: tokenCounts.active,
      inProgressTokens: tokenCounts.in_progress,
      completedTokens: tokenCounts.completed,
      expiredTokens: tokenCounts.expired,
      quotaAvailable: dashboard.quotas.reduce(
        (sum, quota) => sum + quota.quotaAvailable,
        0,
      ),
      resultCount: resultRows.length,
    },
    quotas: dashboard.quotas,
    testProvisioning: testCatalog.map((test) => ({
      testKey: test.key,
      testName: test.name,
      version: test.version,
      description: test.description,
      estimatedMinutes: test.estimatedMinutes,
      implemented: test.implemented,
      entitlement:
        dashboard.quotas.find((quota) => quota.testKey === test.key) ?? null,
    })),
    accessTokens: dashboard.accessTokens,
    recentResults: dashboard.recentResults,
  };
}

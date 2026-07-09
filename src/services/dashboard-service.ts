import { and, desc, eq, ne } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  clientTestQuotas,
  clientUsers,
  clients,
  participants,
  participantTokens,
  results,
  tests,
} from "@/db/schema";
import { generateClientParticipantToken } from "@/services/token-service";
import { getTestDefinition, testCatalog } from "@/tests/registry";
import type { TestKey } from "@/tests/shared/types";

const DEFAULT_DEMO_CLIENT_SLUG = "northstar-advisory";
type ParticipantStatus = "active" | "archived" | "anonymized";

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
  resultLabel: string;
  submittedAt: string;
  retentionUntil: string;
  retentionStatus: "active" | "flagged_for_deletion" | "deleted";
}

export interface DashboardResultDetailDto extends DashboardResultDto {
  tokenId: string;
  tokenPreview: string | null;
  testVersion: string;
  rawAnswers: Record<string, string>;
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
  recentTokens: DashboardTokenDto[];
  recentResults: DashboardResultDto[];
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
  recentTokens: DashboardTokenDto[];
  recentResults: DashboardResultDto[];
}

function toIso(date: Date | null) {
  return date ? date.toISOString() : null;
}

function resultLabel(scoreSummary: Record<string, unknown> | null) {
  const type = scoreSummary?.type;
  return typeof type === "string" ? type : "Pending";
}

function canReissueToken(
  token: {
    participantId: string | null;
    participantReference: string | null;
    participantStatus: ParticipantStatus | null;
    participantDeletedAt: Date | null;
    status: DashboardTokenDto["status"];
    expiresAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  },
  now: Date,
) {
  if (
    token.status !== "active" ||
    token.startedAt ||
    token.completedAt ||
    token.expiresAt.getTime() <= now.getTime()
  ) {
    return false;
  }

  if (token.participantId) {
    return token.participantStatus === "active" && !token.participantDeletedAt;
  }

  return Boolean(token.participantReference);
}

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
    resultLabel: resultLabel(row.scoreSummary),
    submittedAt: row.submittedAt.toISOString(),
    retentionUntil: row.retentionUntil.toISOString(),
    retentionStatus: row.retentionStatus,
  };
}

function mapResultDetail(row: {
  id: string;
  tokenId: string;
  tokenPreview: string | null;
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
  rawAnswers: Record<string, string>;
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
    testVersion: row.testVersion,
    rawAnswers: row.rawAnswers,
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
    .innerJoin(
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
      rawAnswers: results.rawAnswers,
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
    .innerJoin(
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

  const tokenRows = await db
    .select({
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
    .where(eq(participantTokens.clientId, client.clientId))
    .orderBy(desc(participantTokens.createdAt))
    .limit(8);

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
    .innerJoin(
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
    const definition = getTestDefinition(quota.testKey);
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
      implemented: Boolean(definition?.implemented),
    };
  });

  const now = new Date();

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
    recentTokens: tokenRows.map((token) => ({
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
    })),
    recentResults: resultRows.map((row) => ({
      id: row.id,
      testKey: row.testKey,
      testName: row.testName,
      participant: mapResultParticipant(row),
      participantReference: row.participantReference,
      resultLabel: resultLabel(row.scoreSummary),
      submittedAt: row.submittedAt.toISOString(),
      retentionUntil: row.retentionUntil.toISOString(),
      retentionStatus: row.retentionStatus,
    })),
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

export async function generateDashboardToken(input: {
  clientId: string;
  testKey?: TestKey;
  participantId?: string;
  participantReference?: string;
}) {
  const dashboard = await getClientDashboardByClientId(input.clientId);

  if (!dashboard) {
    throw new Error("Client dashboard context was not found.");
  }

  const testKey = input.testKey ?? "mbti";
  const quota = dashboard.quotas.find((row) => row.testKey === testKey);

  if (!quota) {
    throw new Error(`The demo client is not entitled to ${testKey}.`);
  }

  const db = getDb();
  const [clientUser] = await db
    .select()
    .from(clientUsers)
    .where(eq(clientUsers.clientId, dashboard.client.clientId))
    .limit(1);

  return generateClientParticipantToken({
    clientId: input.clientId,
    testId: quota.testId,
    createdByClientUserId: clientUser?.id,
    participantId: input.participantId,
    participantReference:
      input.participantId
        ? undefined
        : input.participantReference?.trim() || `TM-${Date.now()}`,
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
    recentTokens: dashboard.recentTokens,
    recentResults: dashboard.recentResults,
  };
}

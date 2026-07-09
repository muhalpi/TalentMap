import { and, eq, lte } from "drizzle-orm";

import { getDb } from "@/db/client";
import { clients, results } from "@/db/schema";
import {
  addUtcDays,
  RETENTION_DELETE_GRACE_DAYS,
} from "@/lib/retention-policy";

export { RETENTION_DELETE_GRACE_DAYS };

type RetentionStatus = "active" | "flagged_for_deletion" | "deleted";

export interface RetentionOverviewClientDto {
  clientId: string;
  name: string;
  slug: string;
  contractEndsAt: string;
  graceEndsAt: string;
  activeResults: number;
  dueNowResults: number;
  flaggedResults: number;
  deletedResults: number;
  nextRetentionAt: string | null;
}

export interface RetentionOverviewDto {
  stats: {
    totalResults: number;
    activeResults: number;
    dueNowResults: number;
    flaggedResults: number;
    deletedResults: number;
    deletionReadyResults: number;
  };
  clients: RetentionOverviewClientDto[];
}

export interface RetentionSweepResult {
  ranAt: string;
  deleteGraceDays: number;
  flaggedForDeletion: number;
  anonymizedDeleted: number;
  stats: RetentionOverviewDto["stats"];
}

function subtractDays(date: Date, days: number) {
  return addUtcDays(date, -days);
}

function emptyRawAnswers() {
  return {} as Record<string, string>;
}

function emptyScoredResult() {
  return {} as Record<string, unknown>;
}

export async function getRetentionOverview(
  now = new Date(),
): Promise<RetentionOverviewDto> {
  const db = getDb();
  const deletionCutoff = subtractDays(now, RETENTION_DELETE_GRACE_DAYS);
  const clientRows = await db.select().from(clients).orderBy(clients.name);
  const resultRows = await db
    .select({
      id: results.id,
      clientId: results.clientId,
      retentionUntil: results.retentionUntil,
      retentionStatus: results.retentionStatus,
    })
    .from(results);

  const byClient = new Map<
    string,
    {
      activeResults: number;
      dueNowResults: number;
      flaggedResults: number;
      deletedResults: number;
      nextRetentionAt: Date | null;
    }
  >();

  const stats = {
    totalResults: resultRows.length,
    activeResults: 0,
    dueNowResults: 0,
    flaggedResults: 0,
    deletedResults: 0,
    deletionReadyResults: 0,
  };

  for (const client of clientRows) {
    byClient.set(client.clientId, {
      activeResults: 0,
      dueNowResults: 0,
      flaggedResults: 0,
      deletedResults: 0,
      nextRetentionAt: null,
    });
  }

  for (const row of resultRows) {
    const clientStats = byClient.get(row.clientId);

    if (!clientStats) {
      continue;
    }

    if (row.retentionStatus === "active") {
      stats.activeResults += 1;
      clientStats.activeResults += 1;

      if (row.retentionUntil.getTime() <= now.getTime()) {
        stats.dueNowResults += 1;
        clientStats.dueNowResults += 1;
      } else if (
        !clientStats.nextRetentionAt ||
        row.retentionUntil.getTime() < clientStats.nextRetentionAt.getTime()
      ) {
        clientStats.nextRetentionAt = row.retentionUntil;
      }
    }

    if (row.retentionStatus === "flagged_for_deletion") {
      stats.flaggedResults += 1;
      clientStats.flaggedResults += 1;

      if (row.retentionUntil.getTime() <= deletionCutoff.getTime()) {
        stats.deletionReadyResults += 1;
      }
    }

    if (row.retentionStatus === "deleted") {
      stats.deletedResults += 1;
      clientStats.deletedResults += 1;
    }
  }

  return {
    stats,
    clients: clientRows.map((client) => {
      const clientStats = byClient.get(client.clientId);

      return {
        clientId: client.clientId,
        name: client.name,
        slug: client.slug,
        contractEndsAt: client.contractEndsAt.toISOString(),
        graceEndsAt: addUtcDays(
          client.contractEndsAt,
          RETENTION_DELETE_GRACE_DAYS,
        ).toISOString(),
        activeResults: clientStats?.activeResults ?? 0,
        dueNowResults: clientStats?.dueNowResults ?? 0,
        flaggedResults: clientStats?.flaggedResults ?? 0,
        deletedResults: clientStats?.deletedResults ?? 0,
        nextRetentionAt: clientStats?.nextRetentionAt?.toISOString() ?? null,
      };
    }),
  };
}

export async function runRetentionSweep(
  now = new Date(),
): Promise<RetentionSweepResult> {
  const db = getDb();
  const deletionCutoff = subtractDays(now, RETENTION_DELETE_GRACE_DAYS);

  const anonymizedRows = await db
    .update(results)
    .set({
      rawAnswers: emptyRawAnswers(),
      scoredResult: emptyScoredResult(),
      scoreSummary: null,
      interpretation: null,
      retentionStatus: "deleted" satisfies RetentionStatus,
      deletedAt: now,
    })
    .where(
      and(
        eq(results.retentionStatus, "flagged_for_deletion"),
        lte(results.retentionUntil, deletionCutoff),
      ),
    )
    .returning({ id: results.id });

  const flaggedRows = await db
    .update(results)
    .set({
      retentionStatus: "flagged_for_deletion" satisfies RetentionStatus,
    })
    .where(
      and(
        eq(results.retentionStatus, "active"),
        lte(results.retentionUntil, now),
      ),
    )
    .returning({ id: results.id });

  const overview = await getRetentionOverview(now);

  return {
    ranAt: now.toISOString(),
    deleteGraceDays: RETENTION_DELETE_GRACE_DAYS,
    flaggedForDeletion: flaggedRows.length,
    anonymizedDeleted: anonymizedRows.length,
    stats: overview.stats,
  };
}

import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { retentionUntilContractEnd } from "@/db/tenant";
import { clientTestQuotas, clients, participants, tests } from "@/db/schema";
import {
  parseParticipantImportWorkbook,
  parseResultImportWorkbook,
  resultSheetName,
  type ResultImportTestKey,
  type SpreadsheetIssue,
} from "@/services/spreadsheet-workbook";
import {
  buildParticipantMetadata,
  getClientParticipantFieldDefinitions,
} from "@/services/participant-field-service";
import {
  currentImplementedTestRows,
  getTestDefinition,
} from "@/tests/registry";

export class SpreadsheetImportError extends Error {
  constructor(
    message: string,
    readonly issues: SpreadsheetIssue[] = [],
  ) {
    super(message);
    this.name = "SpreadsheetImportError";
  }
}

function duplicateIssues<T>(
  rows: T[],
  sheet: string,
  column: string,
  rowNumber: (row: T) => number,
  valueFor: (row: T) => string | null,
) {
  const seen = new Map<string, number>();
  const issues: SpreadsheetIssue[] = [];
  for (const row of rows) {
    const rawValue = valueFor(row);
    if (!rawValue) continue;
    const value = rawValue.toLowerCase();
    const firstRow = seen.get(value);
    if (firstRow) {
      issues.push({
        sheet,
        row: rowNumber(row),
        column,
        message: `Duplicates row ${firstRow} in this workbook.`,
      });
    } else {
      seen.set(value, rowNumber(row));
    }
  }
  return issues;
}

export async function importParticipantsFromWorkbook(input: {
  clientId: string;
  buffer: Buffer;
}) {
  const definitions = await getClientParticipantFieldDefinitions(
    input.clientId,
  );
  const parsed = await parseParticipantImportWorkbook(
    input.buffer,
    definitions,
  ).catch(() => {
    throw new SpreadsheetImportError(
      "The participant workbook could not be opened. Download a fresh XLSX template and try again.",
    );
  });
  const issues = [...parsed.issues];
  issues.push(
    ...duplicateIssues(
      parsed.rows,
      "Participants",
      "email",
      (row) => row.rowNumber,
      (row) => row.email,
    ),
    ...duplicateIssues(
      parsed.rows,
      "Participants",
      "identifier",
      (row) => row.rowNumber,
      (row) => row.employeeId,
    ),
    ...duplicateIssues(
      parsed.rows,
      "Participants",
      "external_reference",
      (row) => row.rowNumber,
      (row) => row.externalReference,
    ),
  );

  if (issues.length) {
    throw new SpreadsheetImportError(
      "The participant workbook contains validation errors.",
      issues,
    );
  }

  const db = getDb();
  const existing = await db
    .select({
      email: participants.email,
      employeeId: participants.employeeId,
      externalReference: participants.externalReference,
    })
    .from(participants)
    .where(
      and(
        eq(participants.clientId, input.clientId),
        ne(participants.status, "anonymized"),
        isNull(participants.deletedAt),
      ),
    );
  const existingEmail = new Set(
    existing.flatMap((row) => (row.email ? [row.email.toLowerCase()] : [])),
  );
  const existingEmployeeId = new Set(
    existing.flatMap((row) =>
      row.employeeId ? [row.employeeId.toLowerCase()] : [],
    ),
  );
  const existingReference = new Set(
    existing.flatMap((row) =>
      row.externalReference ? [row.externalReference.toLowerCase()] : [],
    ),
  );
  for (const row of parsed.rows) {
    if (row.email && existingEmail.has(row.email.toLowerCase())) {
      issues.push({
        sheet: "Participants",
        row: row.rowNumber,
        column: "email",
        message: "This email already belongs to a participant.",
      });
    }
    if (
      row.employeeId &&
      existingEmployeeId.has(row.employeeId.toLowerCase())
    ) {
      issues.push({
        sheet: "Participants",
        row: row.rowNumber,
        column: "identifier",
        message: "This identifier already belongs to a participant.",
      });
    }
    if (
      row.externalReference &&
      existingReference.has(row.externalReference.toLowerCase())
    ) {
      issues.push({
        sheet: "Participants",
        row: row.rowNumber,
        column: "external_reference",
        message: "This external reference already belongs to a participant.",
      });
    }
  }
  if (issues.length) {
    throw new SpreadsheetImportError(
      "Some participant identities already exist.",
      issues,
    );
  }

  const created = await db
    .insert(participants)
    .values(
      parsed.rows.map((row) => ({
        clientId: input.clientId,
        name: row.name,
        email: row.email,
        employeeId: row.employeeId,
        externalReference: row.externalReference,
        metadata: buildParticipantMetadata(row.tags, row.customFields),
      })),
    )
    .returning({ id: participants.id, name: participants.name })
    .catch(() => []);

  if (created.length !== parsed.rows.length) {
    throw new SpreadsheetImportError(
      "Participants could not be imported. Check the workbook for duplicate identifiers and try again.",
    );
  }

  return { imported: created.length };
}

interface PreparedResultImport {
  rowKey: string;
  participantId: string;
  testId: string;
  testKey: ResultImportTestKey;
  submittedAt: string;
  durationSeconds: number;
  rawAnswers: Record<string, string>;
  scoredResult: Record<string, unknown>;
  scoreSummary: Record<string, unknown>;
  interpretation: Record<string, unknown> | null;
  retentionUntil: string;
}

export async function importResultsFromWorkbook(input: {
  clientId: string;
  requestedByClientUserId: string;
  buffer: Buffer;
  fileName: string;
  participantId?: string;
}) {
  const parsed = await parseResultImportWorkbook(
    input.buffer,
    input.participantId,
  ).catch(() => {
    throw new SpreadsheetImportError(
      "The result workbook could not be opened. Download a fresh XLSX template and try again.",
    );
  });
  const issues = [...parsed.issues];
  const seenAssignments = new Map<string, { sheet: string; row: number }>();
  for (const row of parsed.rows) {
    const key = `${row.participantId}:${row.testKey}`;
    const first = seenAssignments.get(key);
    if (first) {
      issues.push({
        sheet: row.sheet,
        row: row.rowNumber,
        column: "participant_id",
        message: `Duplicates ${row.testKey.toUpperCase()} for this participant from ${first.sheet} row ${first.row}.`,
      });
    } else {
      seenAssignments.set(key, { sheet: row.sheet, row: row.rowNumber });
    }
  }
  if (issues.length) {
    throw new SpreadsheetImportError(
      "The result workbook contains validation errors.",
      issues,
    );
  }

  const db = getDb();
  const participantIds = [
    ...new Set(parsed.rows.map((row) => row.participantId)),
  ];
  const [participantRows, entitlementRows, clientRows] = await Promise.all([
    db
      .select({ id: participants.id, status: participants.status })
      .from(participants)
      .where(
        and(
          eq(participants.clientId, input.clientId),
          inArray(participants.id, participantIds),
          ne(participants.status, "anonymized"),
          isNull(participants.deletedAt),
        ),
      ),
    db
      .select({
        testId: tests.id,
        testKey: tests.testKey,
        version: tests.version,
        isEnabled: tests.isEnabled,
        quotaTotal: clientTestQuotas.quotaTotal,
        quotaReserved: clientTestQuotas.quotaReserved,
        quotaConsumed: clientTestQuotas.quotaConsumed,
        quotaExpiresAt: clientTestQuotas.quotaExpiresAt,
      })
      .from(tests)
      .innerJoin(
        clientTestQuotas,
        and(
          eq(clientTestQuotas.clientId, tests.clientId),
          eq(clientTestQuotas.testId, tests.id),
        ),
      )
      .where(eq(tests.clientId, input.clientId)),
    db
      .select({
        status: clients.status,
        contractEndsAt: clients.contractEndsAt,
      })
      .from(clients)
      .where(eq(clients.clientId, input.clientId))
      .limit(1),
  ]);

  const client = clientRows[0];
  if (!client || client.status !== "active") {
    throw new SpreadsheetImportError("The tenant contract is not active.");
  }
  const participantsById = new Map(participantRows.map((row) => [row.id, row]));
  const entitlementsByKey = new Map(
    currentImplementedTestRows(entitlementRows).map((row) => [
      row.testKey,
      row,
    ]),
  );
  const now = new Date();
  const importCounts = new Map<ResultImportTestKey, number>();
  for (const row of parsed.rows) {
    const participant = participantsById.get(row.participantId);
    if (!participant || participant.status !== "active") {
      issues.push({
        sheet: row.sheet,
        row: row.rowNumber,
        column: "participant_id",
        message: "Participant was not found or is not active in this tenant.",
      });
    }
    const entitlement = entitlementsByKey.get(row.testKey);
    if (!entitlement) {
      issues.push({
        sheet: row.sheet,
        row: row.rowNumber,
        message: `${row.testKey.toUpperCase()} does not have an entitlement for the current scoring version.`,
      });
    } else if (!entitlement.isEnabled) {
      issues.push({
        sheet: row.sheet,
        row: row.rowNumber,
        message: `${row.testKey.toUpperCase()} is disabled for this tenant.`,
      });
    } else {
      const entitlementExpiry =
        entitlement.quotaExpiresAt ?? client.contractEndsAt;
      if (entitlementExpiry.getTime() <= now.getTime()) {
        issues.push({
          sheet: row.sheet,
          row: row.rowNumber,
          message: `${row.testKey.toUpperCase()} entitlement has expired.`,
        });
      }
    }
    importCounts.set(row.testKey, (importCounts.get(row.testKey) ?? 0) + 1);
    try {
      getTestDefinition(row.testKey).score(row.answers);
    } catch (error) {
      issues.push({
        sheet: row.sheet,
        row: row.rowNumber,
        message:
          error instanceof Error
            ? error.message
            : "Answers could not be scored.",
      });
    }
  }
  for (const [testKey, count] of importCounts) {
    const entitlement = entitlementsByKey.get(testKey);
    if (
      entitlement &&
      entitlement.quotaTotal -
        entitlement.quotaReserved -
        entitlement.quotaConsumed <
        count
    ) {
      issues.push({
        sheet: resultSheetName(testKey),
        row: 1,
        message: `${testKey.toUpperCase()} needs ${count} available quota but the tenant has ${Math.max(
          entitlement.quotaTotal -
            entitlement.quotaReserved -
            entitlement.quotaConsumed,
          0,
        )}.`,
      });
    }
  }
  if (issues.length) {
    throw new SpreadsheetImportError(
      "The result workbook could not be imported.",
      issues,
    );
  }

  const prepared: PreparedResultImport[] = parsed.rows.map((row) => {
    const entitlement = entitlementsByKey.get(row.testKey)!;
    const score = getTestDefinition(row.testKey).score(row.answers);
    return {
      rowKey: `${row.sheet}:${row.rowNumber}`,
      participantId: row.participantId,
      testId: entitlement.testId,
      testKey: row.testKey,
      submittedAt: row.submittedAt.toISOString(),
      durationSeconds: row.durationSeconds,
      rawAnswers: row.answers,
      scoredResult: score.result,
      scoreSummary: score.summary,
      interpretation: score.interpretation ?? null,
      retentionUntil: retentionUntilContractEnd(
        client.contractEndsAt,
      ).toISOString(),
    };
  });

  const importPayload = prepared.map((row) => ({
    row_key: row.rowKey,
    participant_id: row.participantId,
    test_id: row.testId,
    test_key: row.testKey,
    submitted_at: row.submittedAt,
    duration_seconds: row.durationSeconds,
    raw_answers: row.rawAnswers,
    scored_result: row.scoredResult,
    score_summary: row.scoreSummary,
    interpretation: row.interpretation,
    retention_until: row.retentionUntil,
  }));

  const importResult = await db
    .execute<{ imported: number }>(
      sql`
    with import_rows as (
      select *
      from jsonb_to_recordset(${JSON.stringify(importPayload)}::jsonb) as imported(
        row_key text,
        participant_id uuid,
        test_id uuid,
        test_key text,
        submitted_at timestamptz,
        duration_seconds integer,
        raw_answers jsonb,
        scored_result jsonb,
        score_summary jsonb,
        interpretation jsonb,
        retention_until timestamptz
      )
    ),
    quota_counts as (
      select
        test_id,
        count(*)::integer as total_count
      from import_rows
      group by test_id
    ),
    quota_updates as (
      update client_test_quotas
      set
        quota_consumed = client_test_quotas.quota_consumed + quota_counts.total_count,
        quota_used = client_test_quotas.quota_consumed + quota_counts.total_count
          + client_test_quotas.quota_reserved,
        updated_at = ${now}
      from quota_counts
      where
        client_test_quotas.client_id = ${input.clientId}
        and client_test_quotas.test_id = quota_counts.test_id
        and client_test_quotas.quota_reserved + client_test_quotas.quota_consumed
          + quota_counts.total_count <= client_test_quotas.quota_total
      returning client_test_quotas.test_id
    ),
    eligible_rows as (
      select import_rows.*
      from import_rows
      inner join quota_updates on quota_updates.test_id = import_rows.test_id
    ),
    inserted_results as (
      insert into results (
        client_id,
        test_id,
        participant_id,
        source,
        imported_by_client_user_id,
        imported_file_name,
        imported_at,
        raw_answers,
        question_timings,
        duration_seconds,
        scored_result,
        score_summary,
        interpretation,
        submitted_at,
        retention_until,
        retention_status
      )
      select
        ${input.clientId},
        eligible_rows.test_id,
        eligible_rows.participant_id,
        'xlsx_import'::result_source,
        ${input.requestedByClientUserId},
        ${input.fileName.slice(0, 255)},
        ${now},
        eligible_rows.raw_answers,
        '{}'::jsonb,
        eligible_rows.duration_seconds,
        eligible_rows.scored_result,
        eligible_rows.score_summary,
        eligible_rows.interpretation,
        eligible_rows.submitted_at,
        eligible_rows.retention_until,
        'active'::retention_status
      from eligible_rows
      returning id
    )
    select
      count(*)::integer
      + (0 / case when count(*) = ${prepared.length} then 1 else 0 end) as imported
    from inserted_results
  `,
    )
    .catch(() => {
      throw new SpreadsheetImportError(
        "The result import could not reserve quota or store every row. Refresh and try again.",
      );
    });
  const imported = Number(importResult.rows[0]?.imported ?? 0);
  if (imported !== prepared.length) {
    throw new SpreadsheetImportError(
      "The result import could not reserve the required quota. Refresh and try again.",
    );
  }
  return { imported };
}

import { NextResponse } from "next/server";

import { getClientSession } from "@/auth/session";
import {
  getClientResultExportRows,
  type DashboardResultDetailDto,
} from "@/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const columns = [
  "result_id",
  "participant_id",
  "participant_name",
  "participant_email",
  "participant_employee_id",
  "participant_reference",
  "test_key",
  "test_name",
  "test_version",
  "result_label",
  "submitted_at",
  "retention_until",
  "retention_status",
  "token_id",
  "token_preview",
  "score_summary_json",
  "scored_result_json",
  "interpretation_json",
  "raw_answers_json",
] as const;

function csvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function rowValues(row: DashboardResultDetailDto) {
  return [
    row.id,
    row.participant?.id,
    row.participant?.name,
    row.participant?.email,
    row.participant?.employeeId,
    row.participantReference,
    row.testKey,
    row.testName,
    row.testVersion,
    row.resultLabel,
    row.submittedAt,
    row.retentionUntil,
    row.retentionStatus,
    row.tokenId,
    row.tokenPreview,
    row.scoreSummary,
    row.scoredResult,
    row.interpretation,
    row.rawAnswers,
  ];
}

function buildCsv(rows: DashboardResultDetailDto[]) {
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => rowValues(row).map(csvCell).join(",")),
  ].join("\r\n");
}

function exportFileName(resultId: string | null) {
  if (resultId) {
    return `talentmap-result-${resultId}.csv`;
  }

  return `talentmap-results-${new Date().toISOString().slice(0, 10)}.csv`;
}

export async function GET(request: Request) {
  const session = await getClientSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resultId = searchParams.get("resultId");
  const rows = await getClientResultExportRows({
    clientId: session.clientId,
    resultId: resultId ?? undefined,
  });

  if (resultId && rows.length === 0) {
    return NextResponse.json({ error: "Result not found." }, { status: 404 });
  }

  return new Response(buildCsv(rows), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${exportFileName(resultId)}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}

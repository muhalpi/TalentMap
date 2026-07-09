import Link from "next/link";
import { Database, Download, Eye } from "lucide-react";

import type { DashboardResultDto } from "@/services/dashboard-service";

import { formatDate } from "./status";

function participantName(row: DashboardResultDto) {
  return (
    row.participant?.name ??
    row.participantReference ??
    "Unlinked participant"
  );
}

function participantDetail(row: DashboardResultDto) {
  if (row.participant?.email) {
    return row.participant.email;
  }

  if (row.participant?.employeeId) {
    return row.participant.employeeId;
  }

  return row.participantReference ?? null;
}

export function ResultTable({ results }: { results: DashboardResultDto[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="hidden grid-cols-[minmax(0,1fr)_80px_92px_124px_200px] border-b border-border bg-surface-muted px-5 py-3 text-xs font-medium uppercase tracking-wide text-foreground/55 xl:grid">
        <span>Participant</span>
        <span>Test</span>
        <span>Result</span>
        <span>Retain Until</span>
        <span>Actions</span>
      </div>
      {results.length ? (
        results.map((row) => (
          <div
            key={row.id}
            className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_80px_92px_124px_200px] xl:items-center xl:gap-0 xl:px-5"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Participant
              </p>
              {row.participant?.profileHref ? (
                <Link
                  href={row.participant.profileHref}
                  className="block truncate text-sm font-medium text-accent hover:text-accent-strong"
                >
                  {participantName(row)}
                </Link>
              ) : (
                <span className="block truncate text-sm font-medium">
                  {participantName(row)}
                </span>
              )}
              {participantDetail(row) ? (
                <span className="mt-1 block truncate font-mono text-xs text-foreground/55">
                  {participantDetail(row)}
                </span>
              ) : null}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Test
              </p>
              <span className="text-sm">{row.testKey.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Result
              </p>
              <span className="font-semibold text-accent">
                {row.resultLabel}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Retain Until
              </p>
              <span className="font-mono text-sm text-foreground/65">
                {formatDate(row.retentionUntil)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-1">
              <Link
                href={`/dashboard/results/${row.id}`}
                className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground/75 hover:border-accent hover:text-accent"
              >
                <Eye size={14} />
                View
              </Link>
              <a
                href={`/api/dashboard/results/export?resultId=${encodeURIComponent(
                  row.id,
                )}`}
                className="inline-flex h-8 items-center gap-2 rounded-full bg-accent px-3 text-xs font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
              >
                <Download size={14} />
                Export CSV
              </a>
            </div>
          </div>
        ))
      ) : (
        <div className="px-5 py-8">
          <Database className="text-foreground/35" size={22} />
          <p className="mt-3 text-sm text-foreground/60">
            No completed assessments yet. Generate a token, complete the MBTI
            flow, and the result will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Database, Eye } from "lucide-react";

import { formatDate, tokenStatusClass } from "@/components/dashboard/status";
import type { ParticipantAssessmentHistoryDto } from "@/services/participant-directory-service";

function resultStatusClass(status: string) {
  if (status === "flagged_for_deletion") {
    return "bg-warning/15 text-warning";
  }

  return "bg-accent-muted text-accent";
}

export function ParticipantHistoryTable({
  history,
}: {
  history: ParticipantAssessmentHistoryDto[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="hidden grid-cols-[minmax(0,1fr)_110px_130px_130px_120px] border-b border-border bg-surface-muted px-5 py-3 text-xs font-medium uppercase tracking-wide text-foreground/55 xl:grid">
        <span>Assessment</span>
        <span>Status</span>
        <span>Submitted</span>
        <span>Retain Until</span>
        <span>Actions</span>
      </div>
      {history.length ? (
        history.map((row) => (
          <div
            key={row.tokenId}
            className="grid gap-4 border-b border-border px-4 py-4 last:border-b-0 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_110px_130px_130px_120px] xl:items-center xl:gap-0 xl:px-5"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Assessment
              </p>
              <p className="truncate font-medium">{row.testName}</p>
              <p className="mt-1 truncate font-mono text-xs text-foreground/55">
                {row.testKey.toUpperCase()} /{" "}
                {row.tokenPreview ?? row.participantReference ?? row.tokenId}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Status
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${tokenStatusClass(
                  row.tokenStatus,
                )}`}
              >
                {row.result ? row.result.resultLabel : row.tokenStatus}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Submitted
              </p>
              <p className="font-mono text-sm text-foreground/65">
                {row.result ? formatDate(row.result.submittedAt) : "Pending"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                Retain Until
              </p>
              {row.result ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-foreground/65">
                    {formatDate(row.result.retentionUntil)}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${resultStatusClass(
                      row.result.retentionStatus,
                    )}`}
                  >
                    {row.result.retentionStatus}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-sm text-foreground/55">
                  {formatDate(row.expiresAt)}
                </span>
              )}
            </div>

            <div className="md:col-span-2 xl:col-span-1">
              {row.result ? (
                <Link
                  href={`/dashboard/results/${row.result.id}`}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground/75 hover:border-accent hover:text-accent"
                >
                  <Eye size={14} />
                  Result
                </Link>
              ) : (
                <span className="text-xs text-foreground/45">No result</span>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="px-5 py-8">
          <Database className="text-foreground/35" size={22} />
          <p className="mt-3 text-sm text-foreground/60">
            No assessment history for this participant.
          </p>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Database, Eye } from "lucide-react";

import type { ParticipantDirectoryItemDto } from "@/services/participant-directory-service";

import { TokenCancelButton } from "./token-cancel-button";
import { TokenReissueButton } from "./token-reissue-button";

function metadataLine(row: ParticipantDirectoryItemDto) {
  return row.customFieldSummary.length
    ? row.customFieldSummary
        .map((field) => `${field.label}: ${field.value}`)
        .join(" · ")
    : null;
}

function participantStatusClass(status: ParticipantDirectoryItemDto["status"]) {
  if (status === "archived") {
    return "bg-warning/15 text-warning";
  }

  return "bg-accent-muted text-accent";
}

function formatOptionalDate(value: string | null) {
  return value ? value.slice(0, 10) : "No activity";
}

export function ParticipantTable({
  participants,
  emptyMessage = "No participant profiles yet.",
}: {
  participants: ParticipantDirectoryItemDto[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="hidden grid-cols-[minmax(0,1.15fr)_minmax(160px,0.85fr)_96px_124px_minmax(190px,1fr)_82px] gap-3 border-b border-border bg-surface-muted px-5 py-3 text-xs font-medium uppercase tracking-wide text-foreground/55 xl:grid">
        <span>Participant</span>
        <span>Identity</span>
        <span>Assessments</span>
        <span>Last activity</span>
        <span>Live access</span>
        <span>Profile</span>
      </div>
      {participants.length ? (
        participants.map((row) => {
          const meta = metadataLine(row);

          return (
            <div
              key={row.id}
              className="grid gap-4 border-b border-border px-4 py-4 last:border-b-0 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(160px,0.85fr)_96px_124px_minmax(190px,1fr)_82px] xl:items-center xl:gap-3 xl:px-5"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                  Participant
                </p>
                <Link
                  href={`/dashboard/participants/${row.id}`}
                  className="block truncate font-medium hover:text-accent"
                >
                  {row.name}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${participantStatusClass(
                      row.status,
                    )}`}
                  >
                    {row.status}
                  </span>
                  {meta ? (
                    <span className="truncate text-xs text-foreground/55">
                      {meta}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                  Identity
                </p>
                <p className="truncate text-sm text-foreground/75">
                  {row.email ?? "No email"}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-foreground/55">
                  {row.employeeId ?? row.externalReference ?? "No identifier"}
                </p>
                <p
                  className="mt-1 truncate font-mono text-[11px] text-foreground/40"
                  title={row.id}
                >
                  ID {row.id}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                  Assessments
                </p>
                <p className="font-mono text-sm font-semibold">
                  {row.completedAssessmentCount}/{row.tokenCount}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                  Last activity
                </p>
                <p className="font-mono text-sm text-foreground/65">
                  {formatOptionalDate(row.latestActivityAt)}
                </p>
              </div>

              <div className="md:col-span-2 xl:col-span-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45 xl:hidden">
                  Live access
                </p>
                {row.liveAssessments.length ? (
                  <div className="mt-1 divide-y divide-border/70 xl:mt-0">
                    {row.liveAssessments.map((assessment) => (
                      <div
                        key={assessment.tokenId}
                        className="flex min-h-10 items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">
                            {assessment.testKey.toUpperCase()}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-foreground/55">
                            {assessment.tokenStatus.replace("_", " ")} · until{" "}
                            {formatOptionalDate(assessment.expiresAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          {assessment.canReissue ? (
                            <TokenReissueButton
                              tokenId={assessment.tokenId}
                              assessmentLabel={assessment.testKey.toUpperCase()}
                            />
                          ) : null}
                          {assessment.canCancel ? (
                            <TokenCancelButton
                              tokenId={assessment.tokenId}
                              assessmentLabel={assessment.testKey.toUpperCase()}
                            />
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-foreground/45 xl:mt-0">
                    No live access
                  </p>
                )}
              </div>

              <div className="md:col-span-2 xl:col-span-1">
                <Link
                  href={`/dashboard/participants/${row.id}`}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground/75 hover:border-accent hover:text-accent"
                >
                  <Eye size={14} />
                  View
                </Link>
              </div>
            </div>
          );
        })
      ) : (
        <div className="px-5 py-8">
          <Database className="text-foreground/35" size={22} />
          <p className="mt-3 text-sm text-foreground/60">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}

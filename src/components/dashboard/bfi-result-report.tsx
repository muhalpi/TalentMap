import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Download,
  UserRound,
} from "lucide-react";

import { formatDate } from "@/components/dashboard/status";
import { ResultImportProvenance } from "@/components/dashboard/result-source-badge";
import { BfiProfileReport } from "@/components/results/bfi-profile-report";
import type { DashboardResultDetailDto } from "@/services/dashboard-service";
import { isBfiScoreOutput } from "@/tests/instruments/bfi/result";
import type { ScoreOutput } from "@/tests/shared/types";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours > 0 ? `${hours}h` : null, `${minutes}m`, `${seconds}s`]
    .filter(Boolean)
    .join(" ");
}

function participantName(result: DashboardResultDetailDto) {
  return (
    result.participant?.name ??
    result.participantReference ??
    result.tokenPreview ??
    "Unlinked participant"
  );
}

function participantDetail(result: DashboardResultDetailDto) {
  return (
    result.participant?.email ??
    result.participant?.employeeId ??
    result.participantReference ??
    result.tokenPreview
  );
}

export function BfiResultReport({
  result,
  backHref = "/dashboard/results",
  exportHref,
  participantHref,
}: {
  result: DashboardResultDetailDto;
  backHref?: string;
  exportHref?: string | null;
  participantHref?: string | null;
}) {
  const scoreCandidate: ScoreOutput = {
    summary: result.scoreSummary ?? {},
    result: result.scoredResult,
    interpretation: result.interpretation ?? {},
  };
  const score = isBfiScoreOutput(scoreCandidate) ? scoreCandidate : null;
  const resolvedParticipantHref =
    participantHref === undefined
      ? result.participant?.profileHref ?? null
      : participantHref;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-base font-medium text-accent hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <ArrowLeft size={18} />
          Results
        </Link>
        {exportHref === undefined ? (
          <a
            href={`/api/dashboard/results/export?resultId=${encodeURIComponent(
              result.id,
            )}`}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-base font-medium text-white shadow-[0_5px_14px_rgb(37_99_235/0.18)] hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Download size={18} />
            Export XLSX
          </a>
        ) : exportHref ? (
          <a
            href={exportHref}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-4 text-base font-medium text-white shadow-[0_5px_14px_rgb(37_99_235/0.18)] hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Download size={18} />
            Export XLSX
          </a>
        ) : null}
      </header>

      <section className="mt-6 rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.1em] text-blue-700">
              {result.testName} · {result.testVersion}
            </p>
            <ResultImportProvenance result={result} />
            <div className="mt-3 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
                <UserRound size={18} />
              </span>
              <div>
                {resolvedParticipantHref ? (
                  <Link
                    href={resolvedParticipantHref}
                    className="text-xl font-semibold text-slate-950 hover:text-blue-700"
                  >
                    {participantName(result)}
                  </Link>
                ) : (
                  <h1 className="text-xl font-semibold text-slate-950">
                    {participantName(result)}
                  </h1>
                )}
                {participantDetail(result) ? (
                  <p className="mt-1 font-mono text-sm leading-5 text-slate-600">
                    {participantDetail(result)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="flex items-center gap-1.5 text-slate-600">
                <CalendarDays size={16} /> Submitted
              </dt>
              <dd className="mt-1 font-mono font-medium text-slate-700">
                {formatDate(result.submittedAt)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-slate-600">
                <Clock3 size={16} /> Duration
              </dt>
              <dd className="mt-1 font-mono font-medium text-slate-700">
                {formatDuration(result.durationSeconds)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Retain until</dt>
              <dd className="mt-1 font-mono font-medium text-slate-700">
                {formatDate(result.retentionUntil)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mt-4">
        {score ? (
          <BfiProfileReport score={score} />
        ) : (
          <div className="rounded-xl border border-red-200 bg-white p-6 shadow-[0_3px_14px_rgb(15_23_42/0.04)]">
            <h2 className="text-base font-semibold text-slate-950">
              Result version mismatch
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This record is marked as a Big Five result, but its stored score
              does not match the current IPIP-BFM-50 report schema. The raw
              record remains available in the CSV export.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

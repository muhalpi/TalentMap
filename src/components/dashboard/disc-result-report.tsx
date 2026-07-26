import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Compass,
  Download,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { ResultImportProvenance } from "@/components/dashboard/result-source-badge";
import { formatDate } from "@/components/dashboard/status";
import {
  DiscProfileReport,
  type DiscReportPatternDetail,
} from "@/components/results/disc-profile-report";
import type { DashboardResultDetailDto } from "@/services/dashboard-service";
import { discPatternProfiles } from "@/tests/instruments/disc/profiles";
import { isDiscScoreOutput } from "@/tests/instruments/disc/result";
import type { DiscPatternKey } from "@/tests/instruments/disc/types";
import type { ScoreOutput } from "@/tests/shared/types";

/**
 * The dashboard's DISC result page.
 *
 * The report body itself is `DiscProfileReport`, shared with the participant
 * screen so the two surfaces cannot drift again. What stays here is the
 * dashboard's own chrome - back link, XLSX export, participant link, submission
 * metadata - and the degraded paths for a record whose payload was emptied by
 * retention or predates the current schema.
 *
 * Unlike the participant screen this is a server component that no client entry
 * imports, so it can read the instrument directly. That is why the pattern's
 * authored field list reaches this surface and not the other one.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looseString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function looseList(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Emotions, Goal, Judges others by and the six alongside them, for a stored
 * pattern key.
 *
 * A FALLBACK, not the normal path. `scoreDiscAnswers` writes these nine onto
 * `result.patternDetail`, and the report prefers what the record carries; this
 * lookup only fills in for a record stored before that field existed. The
 * dashboard can do it because it is a server component no client entry imports -
 * the participant screen cannot, which is the whole reason the narrative travels
 * on the payload.
 *
 * `isDiscScoreOutput` only checks that `patternKey` is a string, so a record
 * written by a different build can name a pattern this one does not have. The
 * membership test is therefore real work, not ceremony: an unknown key returns
 * null and the report prints its own notice in place of the nine rows rather
 * than crashing on an undefined profile.
 */
function patternDetailFor(patternKey: string): DiscReportPatternDetail | null {
  return Object.hasOwn(discPatternProfiles, patternKey)
    ? discPatternProfiles[patternKey as DiscPatternKey]
    : null;
}

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

function ListCard({
  icon,
  items,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  items: string[];
  title: string;
  subtitle?: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm leading-5 text-slate-600">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-2.5 size-1.5 shrink-0 rounded-full bg-slate-400"
            />
            <span className="text-pretty">{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * Fallback for a stored payload that no longer matches the current DISC report
 * schema. Retention-deleted records have an emptied payload, so that case gets
 * its own explanation; anything else is treated as a version mismatch and shows
 * whatever readable copy survived in the record.
 */
function DiscPartialRecord({ result }: { result: DashboardResultDetailDto }) {
  if (result.retentionStatus === "deleted") {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6">
        {/* h1, not h2: the full report's h1 is the pattern name inside
            DiscProfileReport, which this branch replaces, so the degraded page
            would otherwise start at h2 with no top-level heading at all. */}
        <h1 className="text-lg font-semibold text-slate-950">
          Scored profile removed
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
          The answers and the scored DISC profile for this submission were
          removed under this organization&apos;s retention policy. The
          submission record above is all that remains.
        </p>
      </div>
    );
  }

  const name = looseString(result.scoredResult, "name") ?? result.resultLabel;
  const epithet = looseString(result.scoredResult, "epithet");
  const description = looseString(result.scoredResult, "description");
  const generalTraits = looseList(result.scoredResult, "generalTraits");
  const strengths = looseList(result.scoredResult, "strengths");
  const problemAreas = looseList(result.scoredResult, "potentialProblemAreas");
  const interpretation = isRecord(result.interpretation)
    ? result.interpretation
    : null;
  const workplaceSummary = looseString(interpretation, "workplaceSummary");
  const disclaimer = looseString(interpretation, "disclaimer");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-red-200 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6">
        {/* h1 for the same reason as the retention-deleted branch above. */}
        <h1 className="text-lg font-semibold text-slate-950">
          Result version mismatch
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
          This record is marked as a DISC result, but its stored score does not
          match the current DISC report schema, so the graphs and dimension
          detail cannot be rebuilt from it. Anything readable in the record is
          shown below, and the raw record remains available in the XLSX export.
        </p>
      </div>

      {name || epithet || description || workplaceSummary ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6">
          {name ? (
            <h2 className="text-xl font-semibold text-slate-950">{name}</h2>
          ) : null}
          {epithet ? (
            <p className="mt-2 text-base font-medium leading-7 text-slate-700">
              {epithet}
            </p>
          ) : null}
          {description ? (
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              {description}
            </p>
          ) : null}
          {workplaceSummary ? (
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              {workplaceSummary}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <ListCard
          icon={<Compass className="shrink-0 text-slate-500" size={20} />}
          items={generalTraits}
          title="General traits"
        />
        <ListCard
          icon={<CheckCircle2 className="shrink-0 text-emerald-600" size={20} />}
          items={strengths}
          title="Strengths"
        />
        <ListCard
          icon={<ShieldAlert className="shrink-0 text-amber-700" size={20} />}
          items={problemAreas}
          title="Watch for"
        />
      </div>

      {disclaimer ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6">
          <p className="max-w-3xl text-base leading-7 text-blue-900">
            {disclaimer}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function DiscResultReport({
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
  const score = isDiscScoreOutput(scoreCandidate) ? scoreCandidate : null;
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
                  <p className="text-xl font-semibold text-slate-950">
                    {participantName(result)}
                  </p>
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
          <DiscProfileReport
            badgeLabel="Forced-choice DISC profile"
            patternDetail={patternDetailFor(score.summary.patternKey)}
            score={score}
          />
        ) : (
          <DiscPartialRecord result={result} />
        )}
      </section>
    </div>
  );
}

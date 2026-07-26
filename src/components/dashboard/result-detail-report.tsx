import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Download } from "lucide-react";

import { BfiResultReport } from "@/components/dashboard/bfi-result-report";
import { DiscResultReport } from "@/components/dashboard/disc-result-report";
import { ResultTableOfContents } from "@/components/dashboard/result-table-of-contents";
import { ResultImportProvenance } from "@/components/dashboard/result-source-badge";
import { formatDate } from "@/components/dashboard/status";
import type { DashboardResultDetailDto } from "@/services/dashboard-service";
import { personalityClassGroup } from "@/tests/instruments/mbti/result-map";

const scoreDefinitions = [
  { code: "E", label: "Extroverted", color: "#ef3b3b" },
  { code: "I", label: "Introverted", color: "#3388d2" },
  { code: "S", label: "Sensing", color: "#dca229" },
  { code: "N", label: "Intuitive", color: "#7d5bd6" },
  { code: "T", label: "Thinking", color: "#e3691c" },
  { code: "F", label: "Feeling", color: "#39a56c" },
  { code: "P", label: "Perceiving", color: "#d23a92" },
  { code: "J", label: "Judging", color: "#339a96" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function recordValue(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return isRecord(value) ? value : null;
}

function stringList(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function scoreCount(summary: Record<string, unknown> | null, code: string) {
  const counts = summary?.counts;

  if (!isRecord(counts)) {
    return 0;
  }

  const value = counts[code];
  return typeof value === "number" ? value : 0;
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
  if (result.participant?.email) {
    return result.participant.email;
  }

  if (result.participant?.employeeId) {
    return result.participant.employeeId;
  }

  return result.participantReference ?? result.tokenPreview ?? null;
}

function formatPercent(count: number, total: number) {
  return `${((count / total) * 100).toFixed(2).replace(/[.,]0+$/, "")}%`;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours > 0 ? `${hours}h` : null, `${minutes}m`, `${seconds}s`]
    .filter(Boolean)
    .join(" ");
}

function normalizeParagraph(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return null;
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function paragraphs(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/\.\s*\n+/g)
    .map(normalizeParagraph)
    .filter((item): item is string => Boolean(item));
}

function ReportSection({
  children,
  id,
  title,
}: {
  children: React.ReactNode;
  id: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-8">
      <h2
        id={id}
        className="mt-10 text-center text-xl font-semibold tracking-normal"
      >
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextSection({
  collapsible = false,
  id,
  text,
  title,
}: {
  collapsible?: boolean;
  id: string;
  text: string | null;
  title: string;
}) {
  const items = paragraphs(text);

  if (!items.length) {
    return null;
  }

  if (collapsible) {
    return (
      <section className="scroll-mt-8">
        <details className="group mt-10 rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <div>
              <h2
                id={id}
                className="text-left text-xl font-semibold tracking-normal"
              >
                {title}
              </h2>
              <p className="mt-1 text-sm text-foreground/55">
                {items.length} section{items.length === 1 ? "" : "s"}
              </p>
            </div>
            <ChevronDown
              className="shrink-0 text-foreground/45 transition-transform group-open:rotate-180"
              size={20}
            />
          </summary>
          <div className="mt-5 space-y-5 border-t border-border pt-5 text-base leading-8 text-foreground/85">
            {items.map((item) => (
              <p key={item} className="text-pretty">
                {item}
              </p>
            ))}
          </div>
        </details>
      </section>
    );
  }

  return (
    <ReportSection id={id} title={title}>
      <div className="space-y-5 text-base leading-8 text-foreground/85">
        {items.map((item) => (
          <p key={item} className="text-pretty">
            {item}
          </p>
        ))}
      </div>
    </ReportSection>
  );
}

function ListSection({
  id,
  items,
  title,
}: {
  id: string;
  items: string[];
  title: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <ReportSection id={id} title={title}>
      <ul className="list-disc space-y-3 pl-6 text-base leading-8 text-foreground/85">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </ReportSection>
  );
}

export function ResultDetailReport({
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
  const resolvedExportHref =
    exportHref === undefined
      ? `/api/dashboard/results/export?resultId=${encodeURIComponent(result.id)}`
      : exportHref;
  const resolvedParticipantHref =
    participantHref === undefined
      ? result.participant?.profileHref ?? null
      : participantHref;

  if (result.testKey === "bfi") {
    return (
      <BfiResultReport
        result={result}
        backHref={backHref}
        exportHref={resolvedExportHref}
        participantHref={resolvedParticipantHref}
      />
    );
  }

  // DISC has to be caught before the MBTI fallthrough below: a DISC payload has
  // no type letters, so the fallthrough would render an empty type report. The
  // DISC report reads the stored payload defensively and degrades on its own
  // when the record has been emptied or predates the current schema.
  if (result.testKey === "disc") {
    return (
      <DiscResultReport
        result={result}
        backHref={backHref}
        exportHref={resolvedExportHref}
        participantHref={resolvedParticipantHref}
      />
    );
  }

  const type =
    stringValue(result.scoredResult, "type") ??
    stringValue(result.scoreSummary, "type") ??
    result.resultLabel;
  const profile = personalityClassGroup.find((item) => item.type === type);
  const jungianRecord = recordValue(
    result.scoredResult,
    "jungianFunctionalPreference",
  );
  const name = profile?.name ?? stringValue(result.scoredResult, "name");
  const nameDescription =
    profile?.nameDescription ??
    stringValue(result.scoredResult, "nameDescription");
  const epithet = profile?.epithet ?? stringValue(result.scoredResult, "epithet");
  const description =
    profile?.description ?? stringValue(result.scoredResult, "description");
  const imagePath =
    profile && type
      ? `/images/mbti/${type.toLowerCase()}.png`
      : stringValue(result.scoredResult, "imagePath");
  const generalTraits =
    profile?.generalTraits ?? stringList(result.scoredResult, "generalTraits");
  const relationshipStrengths =
    profile?.relationshipStrengths ??
    stringList(result.interpretation, "relationshipStrengths");
  const relationshipWeaknesses =
    profile?.relationshipWeaknesses ??
    stringList(result.interpretation, "relationshipWeaknesses");
  const successDefinition =
    profile?.successDefinition ??
    stringValue(result.interpretation, "successDefinition");
  const strengths =
    profile?.strengths ?? stringList(result.scoredResult, "strengths");
  const gifts = profile?.gifts ?? stringList(result.interpretation, "gifts");
  const potentialProblemAreas =
    profile?.potentialProblemAreas ??
    stringList(result.scoredResult, "potentialProblemAreas");
  const explanationOfProblems = profile?.explanationOfProblems ?? null;
  const solutions = profile?.solutions ?? null;
  const livingHappilyTips =
    profile?.livingHappilyTips ??
    stringValue(result.interpretation, "livingHappilyTips");
  const suggestions = profile?.suggestions ?? [];
  const tenRulesToLive =
    profile?.tenRulesToLive ??
    stringList(result.interpretation, "tenRulesToLive");
  const dominant =
    profile?.jungianFunctionalPreference.dominant ??
    stringValue(jungianRecord, "dominant");
  const auxiliary =
    profile?.jungianFunctionalPreference.auxiliary ??
    stringValue(jungianRecord, "auxiliary");
  const tertiary =
    profile?.jungianFunctionalPreference.tertiary ??
    stringValue(jungianRecord, "tertiary");
  const inferior =
    profile?.jungianFunctionalPreference.inferior ??
    stringValue(jungianRecord, "inferior");
  const totalScoreCount =
    scoreDefinitions.reduce(
      (sum, definition) => sum + scoreCount(result.scoreSummary, definition.code),
      0,
    ) || Object.keys(result.rawAnswers).length || 1;
  const tocItems = [
    { id: "description", label: epithet ?? "Profile", show: Boolean(description) },
    {
      id: "jungian-functional-preference-ordering",
      label: "Jungian Functional Preference Ordering",
      show: Boolean(dominant || auxiliary || tertiary || inferior),
    },
    { id: "general-traits", label: `${type} General Traits`, show: generalTraits.length > 0 },
    { id: "relationship-strengths", label: "Relationship Strengths", show: relationshipStrengths.length > 0 },
    { id: "relationship-weaknesses", label: "Relationship Weaknesses", show: relationshipWeaknesses.length > 0 },
    { id: "success-definition", label: "Success Definition", show: Boolean(successDefinition) },
    { id: "strengths", label: "Strengths", show: strengths.length > 0 },
    { id: "special-gifts", label: "Special Gifts", show: gifts.length > 0 },
    { id: "potential-problem-areas", label: "Potential Problem Areas", show: potentialProblemAreas.length > 0 },
    { id: "explanation-of-problems", label: "Explanation of Problems", show: Boolean(explanationOfProblems) },
    { id: "solutions", label: "Solutions", show: Boolean(solutions) },
    { id: "living-happily-tips", label: "Living Happily Tips", show: Boolean(livingHappilyTips) },
    { id: "specific-suggestions", label: "Specific Suggestions", show: suggestions.length > 0 },
    { id: "ten-rules-to-live-to-achieve-success", label: "Ten Rules to Live to Achieve Success", show: tenRulesToLive.length > 0 },
  ].filter((item) => item.show);

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong"
        >
          <ArrowLeft size={16} />
          Results
        </Link>
        {resolvedExportHref ? (
          <a
            href={resolvedExportHref}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
          >
            <Download size={16} />
            Export XLSX
          </a>
        ) : null}
      </header>

      <section className="mt-8 grid min-w-0 gap-8 xl:grid-cols-[260px_minmax(0,1fr)_250px]">
        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <section>
            <h2 className="text-center text-xl font-semibold">Scores</h2>
            <div className="mt-5 space-y-3">
              {scoreDefinitions.map((definition) => {
                const count = scoreCount(result.scoreSummary, definition.code);

                return (
                  <div
                    key={definition.code}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 py-2 text-white shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                    style={{ backgroundColor: definition.color }}
                  >
                    <span className="font-semibold">{definition.label}</span>
                    <span className="flex min-w-24 justify-center gap-2 rounded-md bg-white px-2 py-1 font-mono font-semibold text-foreground">
                      <span>{formatPercent(count, totalScoreCount)}</span>
                      <span>({count})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
            <h2 className="font-semibold">Result</h2>
            <ResultImportProvenance result={result} />
            <dl className="mt-3 space-y-3">
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="text-foreground/60">Participant</dt>
                <dd className="text-right">
                  {resolvedParticipantHref ? (
                    <Link
                      href={resolvedParticipantHref}
                      className="font-medium text-accent hover:text-accent-strong"
                    >
                      {participantName(result)}
                    </Link>
                  ) : (
                    <span className="font-medium">{participantName(result)}</span>
                  )}
                  {participantDetail(result) ? (
                    <span className="mt-1 block font-mono text-xs text-foreground/55">
                      {participantDetail(result)}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="text-foreground/60">Submitted</dt>
                <dd className="font-mono">{formatDate(result.submittedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="text-foreground/60">Completion Time</dt>
                <dd className="font-mono">
                  {formatDuration(result.durationSeconds)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="text-foreground/60">Retain Until</dt>
                <dd className="font-mono">{formatDate(result.retentionUntil)}</dd>
              </div>
            </dl>
          </section>
        </aside>

        <article className="min-w-0">
          <section className="text-center">
            <p className="font-mono text-xs uppercase tracking-wide text-accent">
              {result.testName}
            </p>
            <h1 className="mx-auto mt-3 max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-foreground md:text-5xl">
              <span className="text-accent">{type}</span>
              {name ? ` - ${name}` : null}
            </h1>
            {nameDescription ? (
              <p className="mt-5 text-xl font-semibold">{nameDescription}</p>
            ) : null}
            {imagePath ? (
              <Image
                src={imagePath}
                alt=""
                width={220}
                height={220}
                priority
                className="mx-auto mt-8"
              />
            ) : null}
            {epithet ? (
              <h2
                id="description"
                className="scroll-mt-8 pt-8 text-xl font-semibold"
              >
                {epithet}
              </h2>
            ) : null}
          </section>

          <div className="mx-auto mt-8 max-w-3xl">
            <div className="space-y-5 text-base leading-8 text-foreground/85">
              {paragraphs(description).map((item) => (
                <p key={item} className="text-pretty">
                  {item}
                </p>
              ))}
            </div>

            {dominant || auxiliary || tertiary || inferior ? (
              <ReportSection
                id="jungian-functional-preference-ordering"
                title="Jungian Functional Preference Ordering"
              >
                <div className="overflow-hidden rounded-xl border border-border">
                  {[
                    ["Dominant", dominant],
                    ["Auxiliary", auxiliary],
                    ["Tertiary", tertiary],
                    ["Inferior", inferior],
                  ].map(([label, value]) =>
                    value ? (
                      <div
                        key={label}
                        className="grid grid-cols-[140px_1fr] border-b border-border last:border-b-0"
                      >
                        <div className="bg-surface-muted px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
                          {label}
                        </div>
                        <div className="px-4 py-3 text-sm">{value}</div>
                      </div>
                    ) : null,
                  )}
                </div>
              </ReportSection>
            ) : null}

            <ListSection
              id="general-traits"
              title={`${type} General Traits`}
              items={generalTraits}
            />
            <ListSection
              id="relationship-strengths"
              title="Relationship Strengths"
              items={relationshipStrengths}
            />
            <ListSection
              id="relationship-weaknesses"
              title="Relationship Weaknesses"
              items={relationshipWeaknesses}
            />
            <TextSection
              id="success-definition"
              title="Success Definition"
              text={successDefinition}
            />
            <ListSection id="strengths" title="Strengths" items={strengths} />
            <ListSection id="special-gifts" title="Special Gifts" items={gifts} />

            {potentialProblemAreas.length === 1 ? (
              <TextSection
                collapsible
                id="potential-problem-areas"
                title="Potential Problem Areas"
                text={potentialProblemAreas[0]}
              />
            ) : (
              <ListSection
                id="potential-problem-areas"
                title="Potential Problem Areas"
                items={potentialProblemAreas}
              />
            )}

            <TextSection
              collapsible
              id="explanation-of-problems"
              title="Explanation of Problems"
              text={explanationOfProblems}
            />
            <TextSection
              collapsible
              id="solutions"
              title="Solutions"
              text={solutions}
            />
            <TextSection
              collapsible
              id="living-happily-tips"
              title="Living Happily Tips"
              text={livingHappilyTips}
            />
            {suggestions.length === 1 ? (
              <TextSection
                collapsible
                id="specific-suggestions"
                title="Specific Suggestions"
                text={suggestions[0]}
              />
            ) : (
              <ListSection
                id="specific-suggestions"
                title="Specific Suggestions"
                items={suggestions}
              />
            )}
            <ListSection
              id="ten-rules-to-live-to-achieve-success"
              title="Ten Rules to Live to Achieve Success"
              items={tenRulesToLive}
            />
          </div>
        </article>

        <aside className="hidden xl:block xl:sticky xl:top-6 xl:self-start">
          <h2 className="text-xl font-semibold">Table Of Content</h2>
          <ResultTableOfContents items={tocItems} />
        </aside>
      </section>
    </div>
  );
}

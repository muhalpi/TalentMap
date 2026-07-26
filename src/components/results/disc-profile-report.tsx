"use client";

import {
  BarChart3,
  CheckCircle2,
  Compass,
  Gauge,
  Info,
  Layers,
  Lightbulb,
  type LucideIcon,
  MessageSquare,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  DiscGraphFigure,
  DiscSegmentReadout,
} from "@/components/results/disc-graph";
import type {
  DiscBand,
  DiscDimensionScore,
  DiscGraph,
  DiscGraphKey,
  DiscPatternNarrative,
  DiscScoreOutput,
} from "@/tests/instruments/disc/types";

/**
 * The one DISC report body, shared by the participant result screen and the
 * dashboard result page.
 *
 * BFI already works this way (`bfi-profile-report.tsx`), and DISC did not: the
 * two surfaces rendered the same payload through two independent components and
 * had already drifted. Everything a reader of a DISC result sees now lives here,
 * so a change lands on both surfaces at once.
 *
 * INSTRUMENT PURITY. This module imports the instrument for TYPES ONLY. Type
 * imports are erased by the compiler, so nothing here can pull an item bank, a
 * conversion table or the adjective keying into a browser bundle. That matters
 * because the participant result screen is reachable from
 * `participant-test-runner.tsx`, a client entry, and
 * `src/components/test/participant-client-graph.test.ts` walks that import graph
 * and fails if any instrument module other than the score type guards appears in
 * it. See `patternDetail` below for the one consequence of that rule.
 */

/* ------------------------------------------------------------------ */
/* Presentational vocabulary                                           */
/* ------------------------------------------------------------------ */

/**
 * Tab order follows the printed report: the Change graph first, because the
 * pattern is derived from it, then Most, then Least.
 */
const graphTabOrder: DiscGraphKey[] = ["perceived", "public", "private"];

/**
 * The roman numeral and short name the printed report gives each graph, plus
 * what reading of the respondent that graph is.
 *
 * The numeral and short name mirror the printed report; `graph.label` and
 * `graph.caption` are still read from the stored result rather than duplicated
 * here, and the raw score behind each point is printed by the figure itself.
 */
const graphTabMeta: Record<
  DiscGraphKey,
  { numeral: string; short: string; meaning: string }
> = {
  perceived: {
    numeral: "III",
    short: "Change",
    meaning:
      "The core self-image, taken from the difference between the other two graphs. This is the graph the pattern below is derived from, so start here.",
  },
  public: {
    numeral: "I",
    short: "Most",
    meaning:
      "The adapted style shown at work, taken from the MOST choices. It includes whatever adjusting is being done to meet what a role appears to expect.",
  },
  private: {
    numeral: "II",
    short: "Least",
    meaning:
      "The instinctive response that tends to surface under pressure, fatigue, or when adapting takes too much effort, taken from the LEAST choices.",
  },
};

/** A segment tuple always prints in the instrument's fixed D-I-S-C order. */
const segmentTupleOrder = ["D", "I", "S", "C"] as const;

const maxIntensity = 28;
const maxSegment = 7;
const totalGroups = 28;

/**
 * Above this many cancelled groups the report says the pattern should be read as
 * provisional. Matches the threshold `interpretation.responseStyle` uses, so the
 * visual emphasis and the prose can never disagree.
 */
const provisionalAmbiguityThreshold = 7;

function bandLabel(band: DiscBand) {
  return `${band[0].toUpperCase()}${band.slice(1)} emphasis`;
}

/** Change scores can be negative, so a positive one is signed explicitly. */
function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

/* ------------------------------------------------------------------ */
/* Tolerating older persisted results                                  */
/* ------------------------------------------------------------------ */

/*
 * `isDiscScoreOutput` narrows a stored payload structurally, and it does not
 * check the fields that landed with the 1-28 intensity scale: a DISC result
 * persisted before that change satisfies the guard and is then TYPED as carrying
 * `dimension.publicIntensity`, `graph.segmentLabel`, `graph.patternKey` and
 * `graph.patternName` while they are `undefined` at runtime. TypeScript cannot
 * catch that, because the guard's assertion is unchecked.
 *
 * The two readers below therefore take a widened parameter type. That is what
 * makes their checks necessary rather than dead code a type-aware lint would
 * flag, and it lets the report print "Not recorded" for one cell instead of
 * rendering `undefined` or `NaN` across a whole section.
 */

function storedNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function storedText(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

const notRecorded = "Not recorded";

function intensityCell(value: number | undefined) {
  const intensity = storedNumber(value);

  return intensity === null ? notRecorded : `${intensity}`;
}

/**
 * This graph's segments as "6-4-2-4".
 *
 * Prefers the stored label, which scoring writes in D-I-S-C order, and rebuilds
 * it from the points when an older result has no label. `point.segment` is one of
 * the fields the type guard does check, so the rebuild is always available.
 */
function segmentTupleFor(graph: DiscGraph) {
  const stored = storedText(graph.segmentLabel);

  if (stored !== null) {
    return stored;
  }

  return segmentTupleOrder
    .map(
      (code) =>
        graph.points.find((point) => point.code === code)?.segment ?? "?",
    )
    .join("-");
}

/** TalentMap's derived pattern for one graph, as "Driving Mobilizer (DI)". */
function graphPatternFor(graph: DiscGraph) {
  const name = storedText(graph.patternName);
  const key = storedText(graph.patternKey);

  if (name === null) {
    return null;
  }

  return key === null ? name : `${name} (${key})`;
}

/* ------------------------------------------------------------------ */
/* Shared chrome                                                       */
/* ------------------------------------------------------------------ */

function ReportSection({
  children,
  description,
  headingId,
  icon: Icon,
  iconClassName,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  headingId: string;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-lg ${iconClassName}`}
        >
          <Icon aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-lg font-semibold text-slate-950 sm:text-xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-[74ch] text-base leading-7 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function InsightList({
  icon: Icon,
  iconClassName,
  items,
}: {
  icon: LucideIcon;
  iconClassName: string;
  items: string[];
}) {
  if (items.length === 0) {
    return (
      <p className="mt-5 text-base leading-7 text-slate-600">
        Nothing recorded for this pattern.
      </p>
    );
  }

  return (
    <ul className="mt-5 space-y-3.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Icon
            aria-hidden="true"
            className={`mt-1 shrink-0 ${iconClassName}`}
            size={18}
          />
          <span className="max-w-[74ch] text-base leading-7 text-slate-700">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* A. The three graphs, behind tabs                                    */
/* ------------------------------------------------------------------ */

interface GraphTab {
  key: DiscGraphKey;
  graph: DiscGraph;
  numeral: string;
  short: string;
}

/**
 * Reveals every graph panel on paper, including the two the `hidden` attribute
 * takes off the screen, so a printed or PDF-exported report is complete.
 *
 * This cannot be a `print:block` utility. Tailwind v4's preflight carries
 *
 *   [hidden]:where(:not([hidden="until-found"])) { display: none !important; }
 *
 * inside `@layer base`, and for `!important` declarations the cascade reverses
 * layer order: the EARLIEST layer wins. A `print:block` utility lands in
 * `@layer utilities`, so it loses whether or not it is marked important. The
 * override therefore has to sit in `base` alongside the rule it is overriding,
 * where the higher specificity (0,2,0) against preflight's (0,1,0) settles it.
 *
 * `@layer base` here is the same layer globals.css names, because both are at
 * the document's top-level layer context, so this appends to it rather than
 * creating a new one. That also makes the rule insensitive to where the
 * stylesheet ends up in `<head>`: same layer, so only specificity decides.
 */
const printAllPanelsCss = `@layer base {
  @media print {
    [data-disc-graph-panel][hidden] {
      display: block !important;
    }
  }
}`;

function GraphTabs({
  defaultGraphKey,
  tabs,
}: {
  defaultGraphKey: DiscGraphKey;
  tabs: GraphTab[];
}) {
  const idBase = useId();
  const tabRefs = useRef<Partial<Record<DiscGraphKey, HTMLButtonElement>>>({});
  const [requestedKey, setRequestedKey] = useState<DiscGraphKey>(
    () =>
      tabs.find((tab) => tab.key === defaultGraphKey)?.key ?? tabs[0].key,
  );
  // A stored result could in principle carry a duplicate graph key, so the
  // requested tab is resolved against what is actually present rather than
  // trusted.
  const activeKey =
    tabs.find((tab) => tab.key === requestedKey)?.key ?? tabs[0].key;

  const tabId = (key: DiscGraphKey) => `${idBase}-tab-${key}`;
  const panelId = (key: DiscGraphKey) => `${idBase}-panel-${key}`;

  function moveTo(index: number) {
    const target = tabs[(index + tabs.length) % tabs.length];

    setRequestedKey(target.key);
    tabRefs.current[target.key]?.focus();
  }

  function onTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    // Left/Right and Home/End only. The tablist is horizontal, so Up/Down are
    // deliberately left alone: they belong to a vertical tablist, and taking
    // them here would stop the page scrolling while a tab has focus.
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTo(index + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTo(index - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveTo(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      moveTo(tabs.length - 1);
    }
  }

  return (
    <div className="mt-6">
      {/* href + precedence let React hoist and de-duplicate this, so the rule
          lands once in <head> even if a page ever renders two reports. */}
      <style href="talentmap-disc-graph-print" precedence="default">
        {printAllPanelsCss}
      </style>

      {/*
        Roving tabindex: the tablist is a single tab stop, and Left/Right (plus
        Home/End) move between the graphs, wrapping at each end. Selection
        follows focus, which is the right choice here because all three panels
        are already rendered, so switching costs nothing.
      */}
      <div
        aria-label="Choose which DISC graph to show"
        className="flex flex-wrap gap-2 print:hidden"
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const selected = tab.key === activeKey;

          return (
            <button
              aria-controls={panelId(tab.key)}
              aria-selected={selected}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                selected
                  ? "border-[#061a38] bg-[#061a38] text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-800"
              }`}
              id={tabId(tab.key)}
              key={tab.key}
              onClick={() => {
                setRequestedKey(tab.key);
              }}
              onKeyDown={(event) => {
                onTabKeyDown(event, index);
              }}
              ref={(node) => {
                if (node === null) {
                  delete tabRefs.current[tab.key];
                  return;
                }

                tabRefs.current[tab.key] = node;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              {/* Uppercased in CSS, so the accessible name stays "Graph III: Change". */}
              Graph {tab.numeral}: {tab.short}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600 print:hidden">
        One graph is shown at a time on screen. All three are included when this
        report is printed or exported.
      </p>

      {tabs.map((tab) => (
        <div
          aria-labelledby={tabId(tab.key)}
          className="mt-5 print:mt-6"
          data-disc-graph-panel=""
          hidden={tab.key !== activeKey}
          id={panelId(tab.key)}
          key={tab.key}
          role="tabpanel"
          // Focusable so that tabbing out of the tablist lands on the panel and
          // announces which graph is being shown, before reaching the figure's
          // own scroll region. Only the shown panel takes a tab stop; the two
          // that print but do not display must not add two dead ones.
          tabIndex={tab.key === activeKey ? 0 : -1}
        >
          {/*
            `min-w-0` on both grid items is load-bearing, not decoration. A grid
            item's automatic minimum size is its min-content size, and the
            figure's min-content is the 33.75rem minimum width of its SVG, so
            without this the single-column grid at phone width is sized to the
            figure and the whole PAGE scrolls sideways instead of the figure's
            own container. Measured: 590px of document scroll width in a 390px
            viewport before this, none after.
          */}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <DiscGraphFigure className="min-w-0" graph={tab.graph} />

            <div className="min-w-0 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <h3 className="text-lg font-semibold text-slate-950">
                  {tab.graph.label}
                </h3>
                <p className="mt-2 max-w-[74ch] text-base leading-7 text-slate-700">
                  {tab.graph.caption}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-base font-semibold text-slate-950">
                  Segment: {segmentTupleFor(tab.graph)}
                </p>
                <DiscSegmentReadout className="mt-4" graph={tab.graph} />
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-900">
                  TalentMap pattern for this graph
                </p>
                <p className="mt-2 text-lg font-semibold leading-7 text-slate-950">
                  {graphPatternFor(tab.graph) ?? "Not recorded for this result"}
                </p>
                <p className="mt-2 max-w-[74ch] text-sm leading-6 text-blue-950">
                  Derived by TalentMap from these four segments. It is not the
                  DiSC Classic classical pattern name, which comes from a
                  licensed table this product does not hold.
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B. The report field list                                            */
/* ------------------------------------------------------------------ */

/**
 * The authored narrative behind the field list, for `score.summary.patternKey`.
 *
 * Scoring writes these nine strings onto `score.result.patternDetail`, so the
 * normal path is that they arrive inside the payload and every surface prints
 * the same twelve rows without importing the instrument. That matters because
 * the participant result screen is reachable from `participant-test-runner.tsx`,
 * a client entry, and a value import of `profiles.ts` would put the adjective
 * keying into the participant's bundle - `participant-client-graph.test.ts`
 * forbids exactly that.
 *
 * The `patternDetail` PROP is the fallback for a result stored before scoring
 * wrote the field. A caller that can reach the instrument passes
 * `discPatternProfiles[score.summary.patternKey]`, which satisfies this shape
 * structurally; a caller that cannot passes null, and if the payload has no
 * narrative either the nine rows are replaced by one honest notice rather than
 * by invented copy.
 */
export type DiscReportPatternDetail = DiscPatternNarrative;

const patternDetailFields = [
  "emotionalTone",
  "motivation",
  "judgesOthersBy",
  "influencesOthersBy",
  "organizationValue",
  "overuses",
  "underPressure",
  "fears",
  "effectiveness",
] as const;

/**
 * The narrative carried by the payload, or null if this result predates it.
 *
 * `isDiscScoreOutput` does not check `result.patternDetail`, so the parameter is
 * widened to admit `undefined` for the same reason `storedNumber` is: a stored
 * result written by an older build is TYPED as carrying the field while it is
 * absent at runtime. Every one of the nine has to be present and non-empty -
 * a half-written narrative would print blank rows under real report labels,
 * which is worse than the notice.
 */
function storedPatternDetail(
  detail: DiscPatternNarrative | undefined,
): DiscReportPatternDetail | null {
  if (detail === undefined || detail === null) {
    return null;
  }

  const complete = patternDetailFields.every(
    (field) => storedText(detail[field]) !== null,
  );

  return complete ? detail : null;
}

interface FieldRow {
  label: string;
  value: string;
  note?: string;
}

/**
 * The printed report's field list, in its order and with its labels.
 *
 * Segment, Pattern and Description come from the stored result. The nine rows
 * between them come from `patternDetail`, and they are contiguous in the
 * report's own order, which is why a missing `patternDetail` collapses to a
 * single notice in the right place instead of nine empty rows.
 */
function fieldRowsFor(
  score: DiscScoreOutput,
  patternGraph: DiscGraph | null,
  patternDetail: DiscReportPatternDetail | null,
): FieldRow[] {
  const segment =
    patternGraph === null
      ? segmentTupleOrder
          .map((code) => storedNumber(score.summary.segments[code]) ?? "?")
          .join("-")
      : segmentTupleFor(patternGraph);

  const rows: FieldRow[] = [
    {
      label: "Segment",
      value: segment,
      note: `Dominance, Influence, Steadiness, Conscientiousness in that order, each on the 1 to ${maxSegment} segment scale, read from Graph III: Change.`,
    },
    {
      label: "Pattern",
      value: `${score.result.name} (${score.summary.patternKey})`,
      note: "TalentMap's own derivation from the four segments above, not the DiSC Classic classical pattern name.",
    },
  ];

  if (patternDetail !== null) {
    rows.push(
      { label: "Emotions", value: patternDetail.emotionalTone },
      { label: "Goal", value: patternDetail.motivation },
      { label: "Judges others by", value: patternDetail.judgesOthersBy },
      {
        label: "Influences others by",
        value: patternDetail.influencesOthersBy,
      },
      {
        label: "Value to the organization",
        value: patternDetail.organizationValue,
      },
      { label: "Overuses", value: patternDetail.overuses },
      { label: "Under pressure", value: patternDetail.underPressure },
      { label: "Fears", value: patternDetail.fears },
      {
        label: "Would increase effectiveness through",
        value: patternDetail.effectiveness,
      },
    );
  }

  rows.push({ label: "Description", value: score.result.description });

  return rows;
}

function PatternFieldList({
  patternDetail,
  patternGraph,
  score,
}: {
  patternDetail: DiscReportPatternDetail | null;
  patternGraph: DiscGraph | null;
  score: DiscScoreOutput;
}) {
  const rows = fieldRowsFor(score, patternGraph, patternDetail);

  return (
    <>
      <dl className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
        {rows.map((row) => (
          <div
            className="grid gap-x-6 gap-y-1 px-4 py-4 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] sm:px-5"
            key={row.label}
          >
            <dt className="text-base font-semibold leading-7 text-slate-900">
              {row.label}
            </dt>
            <dd>
              <p className="max-w-[74ch] text-base leading-7 text-slate-700">
                {row.value}
              </p>
              {row.note ? (
                <p className="mt-1.5 max-w-[74ch] text-sm leading-6 text-slate-600">
                  {row.note}
                </p>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {patternDetail === null ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
          <Info aria-hidden="true" className="mt-1 shrink-0 text-amber-800" size={18} />
          <p className="max-w-[74ch] text-base leading-7 text-slate-800">
            Emotions, Goal, Judges others by, Influences others by, Value to the
            organization, Overuses, Under pressure, Fears and Would increase
            effectiveness through are not stored in this record, which was scored
            before those fields were kept with a result. The narrative sections
            further down still describe this pattern at work, under pressure, and
            in development.
          </p>
        </div>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* C. The four dimensions, as a table                                  */
/* ------------------------------------------------------------------ */

interface DimensionColumn {
  id: string;
  label: string;
  hint: string;
  value: (dimension: DiscDimensionScore) => string;
}

/**
 * One definition per column, so the header row and the body cells cannot drift
 * apart. Ranges live in the header hint rather than being repeated in every
 * cell, which keeps the numbers scannable.
 */
const dimensionColumns: DimensionColumn[] = [
  {
    id: "most",
    label: "Most tally",
    hint: "raw count",
    value: (dimension) => `${dimension.mostScore}`,
  },
  {
    id: "least",
    label: "Least tally",
    hint: "raw count",
    value: (dimension) => `${dimension.leastScore}`,
  },
  {
    id: "change",
    label: "Change score",
    hint: "Most minus Least",
    value: (dimension) => formatSigned(dimension.changeScore),
  },
  {
    id: "public-intensity",
    label: "Graph I intensity",
    hint: `Most, 1 to ${maxIntensity}`,
    value: (dimension) => intensityCell(dimension.publicIntensity),
  },
  {
    id: "public-segment",
    label: "Graph I segment",
    hint: `Most, 1 to ${maxSegment}`,
    value: (dimension) => `${dimension.publicSegment}`,
  },
  {
    id: "private-intensity",
    label: "Graph II intensity",
    hint: `Least, 1 to ${maxIntensity}`,
    value: (dimension) => intensityCell(dimension.privateIntensity),
  },
  {
    id: "private-segment",
    label: "Graph II segment",
    hint: `Least, 1 to ${maxSegment}`,
    value: (dimension) => `${dimension.privateSegment}`,
  },
  {
    id: "perceived-intensity",
    label: "Graph III intensity",
    hint: `Change, 1 to ${maxIntensity}`,
    value: (dimension) => intensityCell(dimension.intensity),
  },
  {
    id: "perceived-segment",
    label: "Graph III segment",
    hint: `Change, 1 to ${maxSegment}`,
    value: (dimension) => `${dimension.segment}`,
  },
  {
    id: "band",
    label: "Band",
    hint: "relative to the other three",
    value: (dimension) => bandLabel(dimension.band),
  },
  {
    id: "position",
    label: "Position",
    hint: "segment rescaled, 0 to 100",
    value: (dimension) => `${dimension.scorePercent}`,
  },
];

function DimensionTable({ dimensions }: { dimensions: DiscDimensionScore[] }) {
  return (
    // The card scrolls, never the page: eleven fully spelled-out column labels
    // will not fit a phone, and abbreviating them would hide meaning.
    //
    // `tabIndex` for the same reason as the figure's own scroller: at phone width
    // this table is far wider than the viewport and holds no focusable cells, so
    // without a tab stop the intensity columns - the text fallback for the chart -
    // could not be reached by keyboard at all. `role="group"` and a name go with
    // it, because a focusable element has to say what it is. WCAG 2.1.1.
    <div
      aria-label="Every number behind the three graphs. Scrollable sideways."
      className="mt-6 overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      role="group"
      tabIndex={0}
    >
      <table className="w-full min-w-[62rem] border-collapse text-left">
        <caption className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-base leading-7 text-slate-700 sm:px-5">
          Every number behind the three graphs. Intensity is the height a graph
          plots, on a 1 to {maxIntensity} scale; the segment is that intensity in
          bands of four, so 1 to {maxSegment}. Graph II runs inverted, so a low
          Least tally gives a high intensity and segment.
        </caption>
        <thead>
          <tr className="border-b border-slate-200 bg-white">
            <th
              className="px-4 py-3 align-bottom text-sm font-semibold text-slate-700 sm:px-5"
              scope="col"
            >
              Dimension
            </th>
            {dimensionColumns.map((column) => (
              <th
                className="px-4 py-3 align-bottom text-sm font-semibold text-slate-700"
                key={column.id}
                scope="col"
              >
                {column.label}
                <span className="mt-0.5 block text-sm font-normal text-slate-600">
                  {column.hint}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dimensions.map((dimension) => (
            <tr
              className="border-b border-slate-100 last:border-b-0"
              key={dimension.key}
            >
              <th
                className="px-4 py-4 text-base font-semibold text-slate-950 sm:px-5"
                scope="row"
              >
                {dimension.label} ({dimension.code})
              </th>
              {dimensionColumns.map((column) => (
                <td
                  className="px-4 py-4 text-base tabular-nums text-slate-800"
                  key={column.id}
                >
                  {column.value(dimension)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The report                                                          */
/* ------------------------------------------------------------------ */

export interface DiscProfileReportProps {
  score: DiscScoreOutput;
  /**
   * Fallback narrative, used only when the payload does not carry one.
   *
   * Scoring writes the nine fields onto `score.result.patternDetail`, so for
   * anything scored by this build the report reads them off the payload and this
   * prop is never consulted. It stays required, and stays non-optional, so a
   * caller of a report that may be handed an older record has to decide what
   * happens then: a surface that can reach the instrument passes
   * `discPatternProfiles[score.summary.patternKey]`, and one that cannot passes
   * null and gets the honest notice.
   */
  patternDetail: DiscReportPatternDetail | null;
  /** Which graph the tabs open on. Defaults to the Change graph. */
  defaultGraphKey?: DiscGraphKey;
  /** Small badge above the title. */
  badgeLabel?: string;
  /** Id of the report's `h1`, so a host page can point a skip link at it. */
  headingId?: string;
  /**
   * Marks the `h1` as the participant surface's post-submission focus target.
   * The dashboard leaves this off; it has its own page header above the report.
   */
  focusHeading?: boolean;
  className?: string;
}

export function DiscProfileReport({
  badgeLabel = "DISC behavioral profile",
  className,
  defaultGraphKey = "perceived",
  focusHeading = false,
  headingId = "disc-profile-report-heading",
  patternDetail,
  score,
}: DiscProfileReportProps) {
  const dimensions = score.result.dimensionProfiles;
  const labelByKey = new Map(
    dimensions.map((dimension) => [dimension.key, dimension.label]),
  );
  const primaryLabel =
    score.result.primaryDimension === null
      ? null
      : labelByKey.get(score.result.primaryDimension) ?? null;
  const secondaryLabel =
    score.result.secondaryDimension === null
      ? null
      : labelByKey.get(score.result.secondaryDimension) ?? null;

  const tabs: GraphTab[] = graphTabOrder.flatMap((key) => {
    const graph = score.result.graphs.find((candidate) => candidate.key === key);

    if (graph === undefined) {
      return [];
    }

    return [
      {
        key,
        graph,
        numeral: graphTabMeta[key].numeral,
        short: graphTabMeta[key].short,
      },
    ];
  });
  const patternGraph =
    tabs.find((tab) => tab.key === "perceived")?.graph ?? null;

  const ambiguousGroups = score.summary.ambiguousGroups;
  const ambiguityIsHigh = ambiguousGroups > provisionalAmbiguityThreshold;

  // The payload's own narrative wins. It is the record of what this respondent
  // was actually told, and it is the only one the participant surface can have;
  // the prop is the fallback for a record stored before scoring wrote it.
  const resolvedPatternDetail =
    storedPatternDetail(score.result.patternDetail) ?? patternDetail;

  return (
    <div className={className ?? "space-y-5"}>
      <section
        aria-labelledby={headingId}
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_3px_14px_rgb(15_23_42/0.04)]"
      >
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-start">
          <div className="min-w-0">
            <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800">
              <Sparkles aria-hidden="true" size={16} />
              {badgeLabel}
            </span>
            <h1
              className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950 focus:outline-none sm:text-[32px]"
              data-participant-result-heading={focusHeading ? true : undefined}
              id={headingId}
              tabIndex={focusHeading ? -1 : undefined}
            >
              {score.result.name}
            </h1>
            <p className="mt-2 text-lg font-medium leading-7 text-slate-700">
              {score.result.epithet}
            </p>
            <p className="mt-4 max-w-[74ch] text-base leading-7 text-slate-700">
              {score.result.description}
            </p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <dt className="text-sm font-medium text-slate-600">
                  Pattern code
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">
                  {score.summary.patternKey}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <dt className="text-sm font-medium text-slate-600">
                  Lead dimension
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">
                  {primaryLabel === null
                    ? "No single dimension stands out"
                    : `${primaryLabel} (${score.summary.primary ?? ""})`}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <dt className="text-sm font-medium text-slate-600">
                  Supporting dimension
                </dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">
                  {secondaryLabel === null
                    ? "None clearly elevated"
                    : `${secondaryLabel} (${score.summary.secondary ?? ""})`}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3">
                <dt className="text-sm font-medium text-slate-600">
                  Groups that cancelled out
                </dt>
                <dd className="mt-1 text-base font-semibold tabular-nums text-slate-900">
                  {ambiguousGroups} of {totalGroups}
                </dd>
              </div>
            </dl>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center gap-2">
              <Compass
                aria-hidden="true"
                className="shrink-0 text-blue-700"
                size={20}
              />
              <h2 className="text-lg font-semibold text-slate-950">
                How to read this profile
              </h2>
            </div>
            <p className="mt-3 text-base leading-7 text-slate-700">
              {score.interpretation.overview}
            </p>
          </aside>
        </div>
      </section>

      <ReportSection
        headingId="disc-graphs-heading"
        icon={Layers}
        iconClassName="bg-violet-50 text-violet-800"
        title="Three graphs, one profile"
      >
        <dl className="mt-6 grid gap-4 lg:grid-cols-3">
          {graphTabOrder.map((key) => {
            const meta = graphTabMeta[key];

            return (
              <div
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
                key={key}
              >
                <dt className="text-base font-semibold text-slate-950">
                  Graph {meta.numeral}: {meta.short}
                </dt>
                <dd className="mt-2 text-base leading-7 text-slate-700">
                  {meta.meaning}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
          <Info
            aria-hidden="true"
            className="mt-1 shrink-0 text-blue-800"
            size={18}
          />
          <p className="max-w-[74ch] text-base leading-7 text-blue-950">
            Graph II runs the opposite way to the number beside it. Its
            conversion is inverted, so rarely choosing a dimension as LEAST like
            you gives that dimension a <em>high</em> intensity and segment: a
            Least tally of 1 sitting next to segment 7 is the table working as
            intended, not a contradiction. Graphs I and III run in the ordinary
            direction.
          </p>
        </div>

        {tabs.length === 0 ? (
          <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-base leading-7 text-slate-700 sm:p-5">
            No graphs were recorded with this result, so there is nothing to
            plot. The dimension table below still carries every stored number.
          </p>
        ) : (
          <GraphTabs defaultGraphKey={defaultGraphKey} tabs={tabs} />
        )}
      </ReportSection>

      <ReportSection
        description="The report field list for the pattern derived from Graph III: Change."
        headingId="disc-pattern-fields-heading"
        icon={Target}
        iconClassName="bg-blue-50 text-blue-800"
        title="This pattern, field by field"
      >
        <PatternFieldList
          patternDetail={resolvedPatternDetail}
          patternGraph={patternGraph}
          score={score}
        />
      </ReportSection>

      <ReportSection
        description="This table is also the readout behind the three graphs: everything drawn above is printed here as text."
        headingId="disc-dimension-table-heading"
        icon={BarChart3}
        iconClassName="bg-blue-50 text-blue-800"
        title="The four dimensions, number by number"
      >
        <DimensionTable dimensions={dimensions} />
        <p className="mt-4 max-w-[74ch] text-sm leading-6 text-slate-600">
          Segments come from the instrument&apos;s own conversion tables, one per
          dimension and graph. They are not percentiles: the comparison this
          instrument makes is between these four dimensions, not against other
          people. The 0 to 100 position is a rescale of the Graph III segment.
        </p>
      </ReportSection>

      <section aria-labelledby="disc-dimension-detail-heading" className="space-y-4">
        <div className="flex items-start gap-3 px-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
            <Gauge aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0">
            <h2
              className="text-lg font-semibold text-slate-950 sm:text-xl"
              id="disc-dimension-detail-heading"
            >
              A closer look at each dimension
            </h2>
            <p className="mt-1 max-w-[74ch] text-base leading-7 text-slate-600">
              Each band is described relative to the other three dimensions
              rather than as a level of ability, and every band carries its own
              strengths.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          {dimensions.map((dimension) => (
            <article
              className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6"
              key={dimension.key}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-950 sm:text-xl">
                    {dimension.label} ({dimension.code})
                  </h3>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                    {bandLabel(dimension.band)} · Graph III segment{" "}
                    {dimension.segment} of {maxSegment} · change score{" "}
                    {formatSigned(dimension.changeScore)}
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="text-2xl font-semibold tabular-nums text-slate-950">
                    {dimension.scorePercent}
                  </span>{" "}
                  of 100
                </p>
              </div>

              <p className="mt-5 max-w-[74ch] text-base leading-7 text-slate-700">
                {dimension.description}
              </p>
              <p className="mt-3 max-w-[74ch] text-base leading-7 text-slate-700">
                {dimension.workStyle}
              </p>

              <div className="mt-5 grid items-start gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
                    <CheckCircle2 aria-hidden="true" size={16} />
                    Strength
                  </div>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {dimension.strength}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-amber-800">
                    <ShieldAlert aria-hidden="true" size={16} />
                    Watch for
                  </div>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {dimension.watchOut}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 border-t border-slate-100 pt-4">
                <Lightbulb
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-amber-600"
                  size={18}
                />
                <p className="text-base leading-7 text-slate-700">
                  {dimension.developmentTip}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ReportSection
        headingId="disc-workplace-heading"
        icon={Compass}
        iconClassName="bg-blue-50 text-blue-800"
        title="This pattern at work"
      >
        <p className="mt-5 max-w-[74ch] border-l-4 border-blue-300 pl-4 text-base font-medium leading-7 text-slate-800">
          {score.interpretation.workplaceSummary}
        </p>
        <div className="mt-5 border-t border-slate-100 pt-5">
          <h3 className="text-lg font-semibold text-slate-950">
            Under pressure
          </h3>
          <p className="mt-3 max-w-[74ch] text-base leading-7 text-slate-700">
            {score.interpretation.stressBehaviors}
          </p>
        </div>
      </ReportSection>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ReportSection
          description="Where this pattern already supports the work and the people around it."
          headingId="disc-strengths-heading"
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-800"
          title="Strengths to build on"
        >
          <InsightList
            icon={CheckCircle2}
            iconClassName="text-emerald-700"
            items={score.result.strengths}
          />
        </ReportSection>

        <ReportSection
          description="Every style carries blind spots alongside its strengths. These are the ones this pattern tends to meet."
          headingId="disc-problem-areas-heading"
          icon={TriangleAlert}
          iconClassName="bg-amber-50 text-amber-800"
          title="Potential problem areas"
        >
          <InsightList
            icon={TriangleAlert}
            iconClassName="text-amber-700"
            items={score.result.potentialProblemAreas}
          />
        </ReportSection>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ReportSection
          description="Practical adjustments for colleagues and managers, and useful things to ask for."
          headingId="disc-communication-heading"
          icon={MessageSquare}
          iconClassName="bg-cyan-50 text-cyan-800"
          title="Communication tips"
        >
          <InsightList
            icon={MessageSquare}
            iconClassName="text-cyan-700"
            items={score.interpretation.communicationTips}
          />
        </ReportSection>

        <ReportSection
          description="Conditions that tend to keep energy and commitment high."
          headingId="disc-motivators-heading"
          icon={Zap}
          iconClassName="bg-orange-50 text-orange-800"
          title="Motivators"
        >
          <InsightList
            icon={Zap}
            iconClassName="text-orange-700"
            items={score.interpretation.motivators}
          />
        </ReportSection>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ReportSection
          description="A fuller view of the tendencies associated with this pattern."
          headingId="disc-traits-heading"
          icon={Sparkles}
          iconClassName="bg-violet-50 text-violet-800"
          title="General traits"
        >
          <InsightList
            icon={Sparkles}
            iconClassName="text-violet-700"
            items={score.result.generalTraits}
          />
        </ReportSection>

        <ReportSection
          description="Small, concrete experiments rather than a change of personality."
          headingId="disc-development-heading"
          icon={Lightbulb}
          iconClassName="bg-amber-50 text-amber-800"
          title="Development tips"
        >
          <InsightList
            icon={Lightbulb}
            iconClassName="text-amber-600"
            items={score.interpretation.developmentTips}
          />
        </ReportSection>
      </div>

      <section
        aria-labelledby="disc-response-style-heading"
        className={`rounded-xl border bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6 ${
          ambiguityIsHigh ? "border-amber-300" : "border-slate-200/90"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-lg ${
              ambiguityIsHigh
                ? "bg-amber-50 text-amber-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {ambiguityIsHigh ? (
              <TriangleAlert aria-hidden="true" size={20} />
            ) : (
              <CheckCircle2 aria-hidden="true" size={20} />
            )}
          </span>
          <div className="min-w-0">
            <h2
              className="text-lg font-semibold text-slate-950 sm:text-xl"
              id="disc-response-style-heading"
            >
              Response style
              {ambiguityIsHigh ? " · read as provisional" : ""}
            </h2>
            <p className="mt-3 max-w-[74ch] text-base leading-7 text-slate-700">
              {score.interpretation.responseStyle}
            </p>
          </div>
        </div>
      </section>

      <ReportSection
        headingId="disc-method-heading"
        icon={Scale}
        iconClassName="bg-slate-100 text-slate-700"
        title="Method and boundaries"
      >
        <p className="mt-5 max-w-[74ch] text-base leading-7 text-slate-700">
          {score.interpretation.methodology}
        </p>
        <p className="mt-4 max-w-[74ch] text-sm leading-6 text-slate-600">
          {score.summary.scoringMethod}
        </p>
        <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/70 p-4">
          <p className="max-w-[74ch] text-base leading-7 text-blue-950">
            {score.interpretation.disclaimer}
          </p>
        </div>
      </ReportSection>
    </div>
  );
}

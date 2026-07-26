import type {
  DiscDimensionCode,
  DiscDimensionKey,
  DiscGraph,
  DiscGraphKey,
  DiscGraphPoint,
} from "@/tests/instruments/disc/types";

/**
 * One DISC graph, drawn the way the instrument's own report draws it.
 *
 * The vertical position of a point is its INTENSITY on the instrument's 1-28
 * scale, not its segment: a segment is that intensity in bands of four, so two
 * dimensions can share a segment and still sit at different heights. Drawing
 * from the segment alone would collapse those two points onto one line, which is
 * why this component plots `point.intensity` and uses `point.segment` only for
 * the printed readouts.
 *
 * This module is deliberately presentational and imports the instrument for
 * TYPES ONLY. Type imports are erased by the compiler, so nothing here can pull
 * an item bank or a scoring table into a browser bundle - see
 * `src/components/test/participant-client-graph.test.ts`, which enforces that.
 */

/* ------------------------------------------------------------------ */
/* Presentational vocabulary                                           */
/* ------------------------------------------------------------------ */

/**
 * Mirrors `discDimensionLabels` in the instrument's `profiles.ts`.
 *
 * Duplicated on purpose: importing it would be a value import from an
 * instrument module, which the bundle guard forbids for any component a
 * participant surface can reach. These four are stable proper nouns.
 */
const dimensionLabels: Record<DiscDimensionKey, string> = {
  dominance: "Dominance",
  influence: "Influence",
  steadiness: "Steadiness",
  conscientiousness: "Conscientiousness",
};

/**
 * The roman numeral and short name the printed report gives each graph, plus
 * the name of the raw score that graph counts. Graph I counts MOST picks,
 * graph II counts LEAST picks, graph III the difference between them.
 */
const graphMeta: Record<
  DiscGraphKey,
  { numeral: string; name: string; valueLabel: string }
> = {
  public: { numeral: "I", name: "Most", valueLabel: "Most tally" },
  private: { numeral: "II", name: "Least", valueLabel: "Least tally" },
  perceived: { numeral: "III", name: "Change", valueLabel: "Change score" },
};

/** Columns always print in the instrument's fixed order, whatever order the points arrive in. */
const columnOrder: DiscDimensionCode[] = ["D", "I", "S", "C"];

const maxIntensity = 28;
const maxSegment = 7;
const segmentSteps = [7, 6, 5, 4, 3, 2, 1];
const midSegment = 4;

/* ------------------------------------------------------------------ */
/* Palette (TalentMap tokens)                                          */
/* ------------------------------------------------------------------ */

const navy = "#061a38";
const strongBlue = "#1d4ed8";
const mutedBlue = "#eaf2ff";
const surface = "#ffffff";
const ink = "#0f172a";
const inkStrong = "#334155";
const inkMuted = "#475569";
const inkFaint = "#64748b";
const titleSubtle = "#cdd9ee";
/**
 * The dashed segment boundaries, and the outline of the six unemphasised segment
 * boxes.
 *
 * 4.27:1 against white and 3.79:1 against the shaded band, so it clears WCAG
 * 1.4.11's 3:1 bar for a meaningful graphic on BOTH backgrounds. That second
 * figure is the one that matters and the one an earlier value missed: the rules
 * bounding segment 4 are stroked exactly on the band edge, so half of each sits
 * on `mutedBlue` rather than on white. They are also the redundant, non-colour
 * encoding of the band - the fill alone is 1.07:1 - so they cannot be allowed to
 * fade into it.
 */
const ruleSoft = "#6b7c92";
/** 4.8:1 against white. Carries the four dimension columns. */
const ruleAxis = "#64748b";
const border = "#e2e8f0";
const borderSoft = "#cbd5e1";

/* ------------------------------------------------------------------ */
/* Geometry — user units, 1:1 with CSS px at the figure's minimum width */
/* ------------------------------------------------------------------ */

const viewWidth = 540;

const titleHeight = 62;

const tabTop = 76;
const tabHeight = 30;
const tabWidth = 42;

const gutterTextX = 14;
const tickRightX = 82;

const plotX0 = 96;
const columnWidth = 80;
const plotX1 = plotX0 + columnWidth * columnOrder.length;

const ruleX0 = plotX0 - 6;

const segmentBoxX = 428;
const segmentBoxWidth = 70;
const segmentBoxCenterX = segmentBoxX + segmentBoxWidth / 2;
const segmentBoxHeight = 44;

const intensityStep = 18;
const plotY0 = 118;
const plotHeight = maxIntensity * intensityStep;
const plotY1 = plotY0 + plotHeight;
const bandHeight = 4 * intensityStep;

const readoutY0 = plotY1;
const readoutHeight = 114;
const patternY0 = readoutY0 + readoutHeight;
const patternHeight = 104;
const viewHeight = patternY0 + patternHeight;

/** Intensity 1 sits at the bottom, 28 at the top, linear in between. */
function yForIntensity(intensity: number) {
  return plotY1 - (intensity - 0.5) * intensityStep;
}

function columnCenterX(index: number) {
  return plotX0 + columnWidth * index + columnWidth / 2;
}

/** Segment `s` covers intensity `4s-3` to `4s`, so its band is four steps tall. */
function segmentBandTop(segment: number) {
  return plotY1 - segment * bandHeight;
}

/* ------------------------------------------------------------------ */
/* Tolerating older persisted results                                  */
/* ------------------------------------------------------------------ */

/*
 * `isDiscScoreOutput` narrows a stored result structurally and does not check
 * the fields added when the intensity scale landed, so a DISC result persisted
 * before that change is typed as carrying `point.intensity`,
 * `graph.segmentLabel`, `graph.patternKey` and `graph.patternName` while they
 * are `undefined` at runtime. TypeScript cannot catch that, so the two readers
 * below take a widened parameter type: that makes their checks necessary rather
 * than dead code, and lets the figure degrade to "not recorded" instead of
 * drawing a point at NaN.
 */

function storedNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function storedText(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * An intensity this figure can actually draw.
 *
 * The scale runs 1 to 28 and the plot area is exactly that tall, so a value
 * outside it has no height here: 0 would land inside the segment-number strip
 * below the plot and 40 outside the viewBox altogether. Current scoring cannot
 * produce either - it derives every segment from the same intensity it plots -
 * but `isGraphPoint` checks the segment and not the intensity, so a payload
 * written by anything else is refused a plotted height rather than given a wrong
 * one. The readout still reports what was stored, so nothing is quietly dropped.
 */
function plottableIntensity(value: number | undefined): number | null {
  const intensity = storedNumber(value);

  if (intensity === null || intensity < 1 || intensity > maxIntensity) {
    return null;
  }

  return intensity;
}

/* ------------------------------------------------------------------ */
/* Data shaping                                                        */
/* ------------------------------------------------------------------ */

interface ColumnSlot {
  code: DiscDimensionCode;
  index: number;
  point: DiscGraphPoint | null;
  label: string;
  /** The height to draw this point at, or null when there is none to draw. */
  intensity: number | null;
  /** What the payload stored, whether or not it is on the 1-28 scale. */
  recordedIntensity: number | null;
  segment: number | null;
}

/** A column with a height, so it can be drawn. */
type PlottedSlot = ColumnSlot & { intensity: number };

function dimensionLabelFor(point: DiscGraphPoint): string {
  // The stored key is only guaranteed to be a string, so an unexpected one
  // falls back to the letter rather than rendering nothing.
  const label: string | undefined = dimensionLabels[point.key];
  return label ?? point.code;
}

function columnSlots(graph: DiscGraph): ColumnSlot[] {
  return columnOrder.map((code, index) => {
    const point = graph.points.find((candidate) => candidate.code === code);

    if (point === undefined) {
      return {
        code,
        index,
        point: null,
        label: code,
        intensity: null,
        recordedIntensity: null,
        segment: null,
      };
    }

    return {
      code,
      index,
      point,
      label: dimensionLabelFor(point),
      intensity: plottableIntensity(point.intensity),
      recordedIntensity: storedNumber(point.intensity),
      segment: storedNumber(point.segment),
    };
  });
}

/**
 * The profile line, split wherever a column has no height to plot.
 *
 * A single polyline over every plotted point would run straight across any
 * column in between, showing a reader an interpolated height that was never
 * scored - the one failure on this figure that would actively misinform rather
 * than merely omit. Splitting into contiguous runs leaves a visible break
 * instead, matching the "–" the segment strip already prints for that column. A
 * run of one draws no line; its own dot still marks it.
 */
function polylineRuns(slots: ColumnSlot[]): string[] {
  const runs: PlottedSlot[][] = [];
  let run: PlottedSlot[] = [];

  for (const slot of slots) {
    if (slot.intensity === null) {
      if (run.length > 0) {
        runs.push(run);
        run = [];
      }

      continue;
    }

    run.push(slot as PlottedSlot);
  }

  if (run.length > 0) {
    runs.push(run);
  }

  return runs
    .filter((points) => points.length > 1)
    .map((points) =>
      points
        .map(
          (slot) =>
            `${columnCenterX(slot.index)},${yForIntensity(slot.intensity)}`,
        )
        .join(" "),
    );
}

/** Change scores can be negative, so a positive one is signed explicitly. */
function formatGraphValue(graphKey: DiscGraphKey, value: number) {
  return graphKey === "perceived" && value > 0 ? `+${value}` : `${value}`;
}

function segmentLabelFor(graph: DiscGraph, slots: ColumnSlot[]) {
  return (
    storedText(graph.segmentLabel) ??
    slots.map((slot) => slot.segment ?? "?").join("-")
  );
}

function patternLabelFor(graph: DiscGraph) {
  const name = storedText(graph.patternName);
  const key = storedText(graph.patternKey);

  if (name === null) {
    return null;
  }

  return key === null ? name : `${name} (${key})`;
}

/**
 * Everything the figure shows, in words.
 *
 * The SVG is `role="img"`, so assistive technology never reaches the numbers
 * drawn inside it. This string therefore has to carry the whole dataset: every
 * dimension's raw score, its intensity and its segment, the segment tuple, and
 * the honest provenance of the pattern name.
 */
function graphDescription(graph: DiscGraph, slots: ColumnSlot[]) {
  const meta = graphMeta[graph.key];
  const pattern = patternLabelFor(graph);

  const readout = slots
    .map((slot) => {
      if (slot.point === null) {
        return `${slot.label}: not recorded`;
      }

      const value = `${meta.valueLabel.toLowerCase()} ${formatGraphValue(graph.key, slot.point.value)}`;
      // Three states, not two: no intensity at all, one on the scale, and one
      // off it. The last is reported as what it is rather than as missing, so
      // the reason nothing is plotted in that column is never guessed at.
      const intensity =
        slot.recordedIntensity === null
          ? "intensity not recorded"
          : slot.intensity === null
            ? `intensity ${slot.recordedIntensity}, outside the 1 to ${maxIntensity} scale, so not plotted`
            : `intensity ${slot.intensity} of ${maxIntensity}`;
      const segment =
        slot.segment === null
          ? "segment not recorded"
          : `segment ${slot.segment} of ${maxSegment}`;

      return `${slot.label} (${slot.code}): ${value}, ${intensity}, ${segment}`;
    })
    .join(". ");

  return [
    `Graph ${meta.numeral}, ${meta.name}: ${graph.label}.`,
    `Each dimension is plotted at its intensity on a 1 to ${maxIntensity} scale, with 1 at the bottom; a segment is that intensity in bands of four, so 1 to ${maxSegment}.`,
    graph.key === "private"
      ? "This graph's conversion is inverted, so a low Least tally converts to a high intensity."
      : null,
    `${readout}.`,
    `Segment numbers in D, I, S, C order: ${segmentLabelFor(graph, slots)}.`,
    pattern === null
      ? "TalentMap pattern: not recorded for this result."
      : `TalentMap pattern: ${pattern}. That name is TalentMap's own derivation from these four segments, not a DiSC Classic classical pattern.`,
  ]
    .filter((sentence): sentence is string => sentence !== null)
    .join(" ");
}

/* ------------------------------------------------------------------ */
/* The figure                                                          */
/* ------------------------------------------------------------------ */

export interface DiscGraphFigureProps {
  graph: DiscGraph;
  className?: string;
}

export function DiscGraphFigure({ graph, className }: DiscGraphFigureProps) {
  const meta = graphMeta[graph.key];
  const slots = columnSlots(graph);
  const pattern = patternLabelFor(graph);
  const plotted = slots.filter(
    (slot): slot is PlottedSlot => slot.intensity !== null,
  );
  const runs = polylineRuns(slots);

  return (
    <figure className={className}>
      {/*
        The scroll container, not the page, absorbs a narrow viewport. `min-width`
        is in rem so the figure grows with the reader's own font size and never
        renders its text below the size it was laid out at: at or above 540 CSS px
        of available width the SVG scales up, below it the container scrolls.

        Below that width the right-hand half of the chart - the S and C columns,
        the segment gutter and its seven boxes - is off-screen, and a browser does
        not make a scroller focusable on its own. Without `tabIndex` a keyboard
        user with no pointer could not bring any of it into view: focusing the
        tabpanel does not let arrow keys drive a descendant scroller, so the
        arrows would scroll the page instead. `tabIndex` makes the region a tab
        stop that arrow keys scroll, and because a focusable element has to say
        what it is, `role="group"` plus a name naming this graph go with it. This
        is WCAG 2.1.1 and axe's scrollable-region-focusable rule.
      */}
      <div
        aria-label={`Graph ${meta.numeral}, ${meta.name}: ${graph.label} chart. Scrollable sideways.`}
        className="overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_14px_rgb(15_23_42/0.04)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        role="group"
        tabIndex={0}
      >
        <svg
          aria-label={graphDescription(graph, slots)}
          className="block h-auto w-full"
          role="img"
          style={{ minWidth: "33.75rem" }}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        >
          {/* Title bar */}
          <rect fill={navy} height={titleHeight} width={viewWidth} x={0} y={0} />
          <text
            fill={surface}
            fontSize={17}
            fontWeight={600}
            letterSpacing={0.8}
            textAnchor="middle"
            x={viewWidth / 2}
            y={28}
          >
            {`GRAPH ${meta.numeral} · ${meta.name}`}
          </text>
          <text
            fill={titleSubtle}
            fontSize={14}
            textAnchor="middle"
            x={viewWidth / 2}
            y={49}
          >
            {graph.label}
          </text>

          {/* Gutter headings, on the same row as the dimension tabs */}
          <text
            fill={inkMuted}
            fontSize={14}
            fontWeight={600}
            x={gutterTextX}
            y={97}
          >
            Intensity
          </text>
          <text
            fill={inkMuted}
            fontSize={14}
            fontWeight={600}
            textAnchor="middle"
            x={segmentBoxCenterX}
            y={97}
          >
            Segment
          </text>

          {/* Segment band 4 — the midline of the 1 to 7 scale. The fill is a
              redundant emphasis: the band is also bounded by the same dashed
              rules as every other band and named by the numbers in both
              gutters, so no information here rests on colour. */}
          <rect
            fill={mutedBlue}
            height={bandHeight}
            width={plotX1 - plotX0}
            x={plotX0}
            y={segmentBandTop(midSegment)}
          />

          {/* Plot frame and the segment boundaries. These are thresholds rather
              than a plain grid - each one is the edge of a segment band - which
              is what the dashes say. */}
          <line
            stroke={borderSoft}
            strokeWidth={1}
            x1={ruleX0}
            x2={segmentBoxX}
            y1={plotY0}
            y2={plotY0}
          />
          {[1, 2, 3, 4, 5, 6].map((boundary) => (
            <line
              key={boundary}
              stroke={ruleSoft}
              strokeDasharray="4 4"
              strokeWidth={1}
              x1={ruleX0}
              x2={segmentBoxX}
              y1={plotY1 - boundary * bandHeight}
              y2={plotY1 - boundary * bandHeight}
            />
          ))}

          {/* Intensity scale, 28 down to 1. Every fourth value tops a segment
              band, so those are set stronger. */}
          <g style={{ fontVariantNumeric: "tabular-nums" }}>
            {Array.from({ length: maxIntensity }, (_, offset) => {
              const intensity = maxIntensity - offset;
              const bandTop = intensity % 4 === 0 || intensity === 1;

              return (
                <text
                  fill={bandTop ? inkStrong : inkFaint}
                  fontSize={14}
                  fontWeight={bandTop ? 600 : 400}
                  key={intensity}
                  textAnchor="end"
                  x={tickRightX}
                  y={yForIntensity(intensity) + 4.8}
                >
                  {intensity}
                </text>
              );
            })}
          </g>

          {/* Segment scale, 7 down to 1, one box centred in each band */}
          {segmentSteps.map((segment) => {
            const mid = segment === midSegment;
            const boxY =
              segmentBandTop(segment) + (bandHeight - segmentBoxHeight) / 2;

            return (
              <g key={segment}>
                <rect
                  fill={mid ? mutedBlue : surface}
                  height={segmentBoxHeight}
                  rx={10}
                  stroke={mid ? navy : ruleSoft}
                  strokeWidth={mid ? 1.5 : 1}
                  width={segmentBoxWidth}
                  x={segmentBoxX}
                  y={boxY}
                />
                <text
                  fill={navy}
                  fontSize={22}
                  fontWeight={600}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  textAnchor="middle"
                  x={segmentBoxCenterX}
                  y={boxY + segmentBoxHeight / 2 + 8}
                >
                  {segment}
                </text>
              </g>
            );
          })}

          {/* Dimension columns: a navy tab sitting on each vertical axis */}
          {slots.map((slot) => {
            const centerX = columnCenterX(slot.index);

            return (
              <g key={slot.code}>
                <line
                  stroke={ruleAxis}
                  strokeWidth={1}
                  x1={centerX}
                  x2={centerX}
                  y1={tabTop + tabHeight}
                  y2={plotY1}
                />
                <rect
                  fill={navy}
                  height={tabHeight}
                  rx={10}
                  width={tabWidth}
                  x={centerX - tabWidth / 2}
                  y={tabTop}
                />
                <text
                  fill={surface}
                  fontSize={17}
                  fontWeight={700}
                  textAnchor="middle"
                  x={centerX}
                  y={tabTop + 21}
                >
                  {slot.code}
                </text>
              </g>
            );
          })}

          {/* The profile itself. One series, so one ink - the four dimensions
              are identified by their tabs and by the readout below, never by
              colour. */}
          {runs.map((points) => (
            <polyline
              fill="none"
              key={points}
              points={points}
              stroke={navy}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
            />
          ))}

          {plotted.map((slot) => {
            const centerX = columnCenterX(slot.index);
            const centerY = yForIntensity(slot.intensity);
            // Keep the value label inside the plot when the point is at the very
            // top of the scale.
            const above = centerY >= plotY0 + 24;

            return (
              <g key={slot.code}>
                <circle
                  cx={centerX}
                  cy={centerY}
                  fill={navy}
                  r={5.5}
                  stroke={surface}
                  strokeWidth={2.5}
                />
                <text
                  fill={ink}
                  fontSize={14}
                  fontWeight={600}
                  stroke={surface}
                  strokeWidth={3.5}
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    paintOrder: "stroke",
                  }}
                  textAnchor="middle"
                  x={centerX}
                  y={above ? centerY - 13 : centerY + 22}
                >
                  {slot.intensity}
                </text>
              </g>
            );
          })}

          {/* Two lines, because SVG text does not wrap and one line long enough
              to say this would run into both gutters. */}
          {plotted.length === 0 ? (
            <>
              <text
                fill={inkStrong}
                fontSize={15}
                textAnchor="middle"
                x={(plotX0 + plotX1) / 2}
                y={segmentBandTop(midSegment) + bandHeight / 2 - 4}
              >
                Plotted heights are not
              </text>
              <text
                fill={inkStrong}
                fontSize={15}
                textAnchor="middle"
                x={(plotX0 + plotX1) / 2}
                y={segmentBandTop(midSegment) + bandHeight / 2 + 18}
              >
                recorded for this result
              </text>
            </>
          ) : null}

          {/* Segment numbers */}
          <line
            stroke={border}
            strokeWidth={1}
            x1={0}
            x2={viewWidth}
            y1={readoutY0}
            y2={readoutY0}
          />
          <text
            fill={inkMuted}
            fontSize={14}
            fontWeight={600}
            letterSpacing={1}
            x={gutterTextX}
            y={readoutY0 + 26}
          >
            SEGMENT NUMBERS
          </text>
          <text
            fill={navy}
            fontSize={17}
            fontWeight={600}
            style={{ fontVariantNumeric: "tabular-nums" }}
            textAnchor="middle"
            x={segmentBoxCenterX}
            y={readoutY0 + 27}
          >
            {segmentLabelFor(graph, slots)}
          </text>
          {slots.map((slot) => {
            const centerX = columnCenterX(slot.index);

            return (
              <g key={slot.code}>
                <rect
                  fill={mutedBlue}
                  height={44}
                  rx={10}
                  stroke={navy}
                  strokeWidth={1.25}
                  width={52}
                  x={centerX - 26}
                  y={readoutY0 + 38}
                />
                <text
                  fill={navy}
                  fontSize={22}
                  fontWeight={600}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  textAnchor="middle"
                  x={centerX}
                  y={readoutY0 + 70}
                >
                  {slot.segment ?? "–"}
                </text>
              </g>
            );
          })}

          {/* The raw score each segment was converted from */}
          <text
            fill={inkMuted}
            fontSize={14}
            x={gutterTextX}
            y={readoutY0 + 104}
          >
            {meta.valueLabel}
          </text>
          {slots.map((slot) => (
            <text
              fill={ink}
              fontSize={15}
              fontWeight={600}
              key={slot.code}
              style={{ fontVariantNumeric: "tabular-nums" }}
              textAnchor="middle"
              x={columnCenterX(slot.index)}
              y={readoutY0 + 104}
            >
              {slot.point === null
                ? "–"
                : formatGraphValue(graph.key, slot.point.value)}
            </text>
          ))}

          {/* TalentMap's derived pattern. Labelled as ours, because the DiSC
              Classic classical-pattern names come from a licensed table this
              codebase does not hold and are not guessed at. */}
          <rect
            fill={mutedBlue}
            height={patternHeight}
            width={viewWidth}
            x={0}
            y={patternY0}
          />
          <line
            stroke={border}
            strokeWidth={1}
            x1={0}
            x2={viewWidth}
            y1={patternY0}
            y2={patternY0}
          />
          <text
            fill={strongBlue}
            fontSize={14}
            fontWeight={600}
            letterSpacing={1}
            x={gutterTextX}
            y={patternY0 + 26}
          >
            TALENTMAP PATTERN
          </text>
          <text
            fill={ink}
            fontSize={19}
            fontWeight={600}
            x={gutterTextX}
            y={patternY0 + 56}
          >
            {pattern ?? "Not recorded for this result"}
          </text>
          {pattern === null ? null : (
            <text
              fill={inkStrong}
              fontSize={14}
              x={gutterTextX}
              y={patternY0 + 82}
            >
              TalentMap&apos;s own derivation, not a DiSC Classic pattern.
            </text>
          )}
        </svg>
      </div>

      <figcaption className="mt-3 text-base leading-7 text-slate-600">
        Height is the intensity the instrument norms, 1 at the bottom to{" "}
        {maxIntensity} at the top. A segment is that intensity in bands of four,
        so the shaded band is segment {midSegment}, the midline of the 1 to{" "}
        {maxSegment} segment scale.
        {graph.key === "private"
          ? " This graph's conversion is inverted, so a low Least tally sits high."
          : ""}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Segment readout, on its own                                         */
/* ------------------------------------------------------------------ */

export interface DiscSegmentReadoutProps {
  graph: DiscGraph;
  className?: string;
}

/**
 * The same segment tuple the figure prints, as plain HTML.
 *
 * Useful next to the figure or anywhere the numbers are wanted without the
 * chart: unlike the SVG this wraps, reflows and is read out term by term, and
 * it spells each dimension out rather than relying on its letter.
 */
export function DiscSegmentReadout({
  graph,
  className,
}: DiscSegmentReadoutProps) {
  const slots = columnSlots(graph);

  return (
    <div className={className}>
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-600">
        Segment numbers
      </p>
      <dl className="mt-2 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <div
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            key={slot.code}
          >
            <dt className="text-sm font-medium text-slate-700">
              {slot.label} ({slot.code})
            </dt>
            <dd className="text-lg font-semibold tabular-nums leading-6 text-slate-950">
              {slot.segment ?? "–"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2.5 text-sm leading-6 text-slate-600">
        D-I-S-C order:{" "}
        <span className="font-semibold tabular-nums text-slate-900">
          {segmentLabelFor(graph, slots)}
        </span>{" "}
        · each segment runs 1 to {maxSegment}
      </p>
    </div>
  );
}

import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import {
  DiscGraphFigure,
  DiscSegmentReadout,
} from "@/components/results/disc-graph";
import { DiscProfileReport } from "@/components/results/disc-profile-report";
import { discPatternProfiles } from "@/tests/instruments/disc/profiles";
import { discQuestions } from "@/tests/instruments/disc/questions";
import { isDiscScoreOutput } from "@/tests/instruments/disc/result";
import { scoreDiscAnswers } from "@/tests/instruments/disc/scoring";
import { discTermGroups } from "@/tests/instruments/disc/terms";
import type { DiscTermGroup, DiscTermPosition } from "@/tests/instruments/disc/terms";
import type {
  DiscDimensionCode,
  DiscGraph,
  DiscScoreOutput,
} from "@/tests/instruments/disc/types";
import type { AnswerMap } from "@/tests/shared/types";

/**
 * What the two DISC result surfaces actually render.
 *
 * The instrument's own tests prove the numbers; these prove that a reader is
 * shown them. Two defects this file exists to keep out:
 *
 *  - the participant surface rendering a shorter report than the dashboard,
 *    which is what happened while the pattern's nine authored narrative fields
 *    were resolved by importing the instrument (something a participant-facing
 *    component may never do) instead of being carried on the payload;
 *  - a chart whose right-hand half is unreachable by keyboard at phone width,
 *    or that draws a line through a column it has no height for.
 *
 * Rendered with `renderToStaticMarkup` rather than in a browser: every assertion
 * here is about markup that is emitted on the server, so a DOM would add a
 * dependency without adding coverage.
 */

/* ------------------------------------------------------------------ */
/* Fixtures, built from the item bank rather than transcribed          */
/* ------------------------------------------------------------------ */

function positionFor(
  group: DiscTermGroup,
  code: DiscDimensionCode,
): DiscTermPosition {
  const term = group.terms.find((candidate) => candidate.dimension === code);

  assert.ok(term, `group ${group.group} has no ${code} term`);

  return term.position;
}

/**
 * A complete answer set that picks `most` as MOST and `least` as LEAST in every
 * group. The two must differ, which is the same rule the questionnaire enforces.
 */
function answersFor(most: DiscDimensionCode, least: DiscDimensionCode): AnswerMap {
  assert.notEqual(most, least);

  const answers: AnswerMap = {};

  for (const group of discTermGroups) {
    const slug = `g${String(group.group).padStart(2, "0")}`;
    answers[`${slug}m`] = positionFor(group, most);
    answers[`${slug}l`] = positionFor(group, least);
  }

  assert.equal(Object.keys(answers).length, discQuestions.length);

  return answers;
}

function scoreFor(
  most: DiscDimensionCode,
  least: DiscDimensionCode,
): DiscScoreOutput {
  return scoreDiscAnswers(answersFor(most, least));
}

/** Deep clone through JSON, which is how a score reaches the database and back. */
function persisted(score: DiscScoreOutput): DiscScoreOutput {
  return JSON.parse(JSON.stringify(score)) as DiscScoreOutput;
}

function definitionTerms(html: string): string[] {
  return [...html.matchAll(/<dt[^>]*>([^<]*)</g)].map((match) => match[1]);
}

/** The printed report's field list, in its order. */
const reportFieldLabels = [
  "Segment",
  "Pattern",
  "Emotions",
  "Goal",
  "Judges others by",
  "Influences others by",
  "Value to the organization",
  "Overuses",
  "Under pressure",
  "Fears",
  "Would increase effectiveness through",
  "Description",
];

const narrativeFields = [
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

/* ------------------------------------------------------------------ */
/* The report field list                                               */
/* ------------------------------------------------------------------ */

test("scoring carries the pattern's nine narrative fields on the payload", () => {
  // The participant surface is reachable from a client entry, so it cannot look
  // these up - a value import of profiles.ts would ship the adjective keying, the
  // answer key, to the browser. Storing them is what lets it print the same
  // report the dashboard prints.
  for (const [most, least] of [
    ["D", "S"],
    ["I", "C"],
    ["S", "D"],
    ["C", "I"],
  ] as Array<[DiscDimensionCode, DiscDimensionCode]>) {
    const score = scoreFor(most, least);
    const authored = discPatternProfiles[score.summary.patternKey];
    const detail = score.result.patternDetail;

    assert.ok(detail, `${most}/${least} stored no patternDetail`);

    for (const field of narrativeFields) {
      assert.equal(
        detail[field],
        authored[field],
        `${most}/${least} ${field} must match the authored profile for ${score.summary.patternKey}`,
      );
      assert.ok(
        detail[field].trim().length > 0,
        `${most}/${least} ${field} must not be empty`,
      );
    }
  }
});

test("both result surfaces render all twelve report fields", () => {
  const score = persisted(scoreFor("D", "S"));

  // The participant surface's call: no instrument available, so no fallback
  // narrative. This is the exact prop shape disc-participant-result.tsx uses.
  const participant = renderToStaticMarkup(
    <DiscProfileReport patternDetail={null} score={score} />,
  );
  // The dashboard's call: the instrument is reachable, so a fallback is passed.
  const dashboard = renderToStaticMarkup(
    <DiscProfileReport
      patternDetail={discPatternProfiles[score.summary.patternKey]}
      score={score}
    />,
  );

  for (const [surface, html] of [
    ["participant", participant],
    ["dashboard", dashboard],
  ] as const) {
    const terms = definitionTerms(html);

    for (const label of reportFieldLabels) {
      assert.ok(
        terms.includes(label),
        `${surface} report is missing the "${label}" field`,
      );
    }

    // The notice only belongs on a record that genuinely has no narrative.
    assert.ok(
      !html.includes("scored before those fields were kept with a result"),
      `${surface} report must not show the missing-narrative notice`,
    );
  }

  // Same payload, same report: the two surfaces differ only in the badge above
  // the title and the focus attribute on its heading, so anything else drifting
  // apart shows up as a difference in the field list.
  assert.deepEqual(
    definitionTerms(participant),
    definitionTerms(dashboard),
    "the two surfaces must render the same field list",
  );
});

test("a record stored without the narrative degrades honestly, and the prop fills it", () => {
  const score = persisted(scoreFor("I", "C"));
  const legacy = persisted(score);
  // A DISC result written before scoring stored the narrative. isDiscScoreOutput
  // does not check the field, so such a record still reaches the report typed as
  // carrying it.
  delete (legacy.result as { patternDetail?: unknown }).patternDetail;

  assert.ok(
    isDiscScoreOutput(legacy),
    "an older payload must still satisfy the score type guard",
  );

  const withoutFallback = renderToStaticMarkup(
    <DiscProfileReport patternDetail={null} score={legacy} />,
  );
  const terms = definitionTerms(withoutFallback);

  for (const label of ["Segment", "Pattern", "Description"]) {
    assert.ok(terms.includes(label), `${label} must still render`);
  }
  for (const label of ["Emotions", "Goal", "Fears"]) {
    assert.ok(
      !terms.includes(label),
      `${label} must not be invented for a record that has no narrative`,
    );
  }
  assert.ok(
    withoutFallback.includes("scored before those fields were kept with a result"),
    "the reader must be told why the nine rows are absent",
  );

  // A surface that can reach the instrument fills the gap for the same record.
  const withFallback = renderToStaticMarkup(
    <DiscProfileReport
      patternDetail={discPatternProfiles[legacy.summary.patternKey]}
      score={legacy}
    />,
  );

  for (const label of reportFieldLabels) {
    assert.ok(
      definitionTerms(withFallback).includes(label),
      `the fallback must restore the "${label}" field`,
    );
  }
});

test("a half-written narrative is refused rather than printed as blank rows", () => {
  const score = persisted(scoreFor("S", "D"));
  (score.result.patternDetail as { fears: string }).fears = "   ";

  const html = renderToStaticMarkup(
    <DiscProfileReport patternDetail={null} score={score} />,
  );

  assert.ok(
    !definitionTerms(html).includes("Fears"),
    "a blank field must not print under a real report label",
  );
  assert.ok(
    html.includes("scored before those fields were kept with a result"),
    "an incomplete narrative must fall back to the notice",
  );
});

/* ------------------------------------------------------------------ */
/* Keyboard reach                                                      */
/* ------------------------------------------------------------------ */

/**
 * Attributes of the element that opens a horizontal scroll container.
 *
 * Both scrollers hold content far wider than a phone viewport and neither holds
 * a focusable descendant, so without a tab stop a keyboard user with no pointer
 * cannot bring the right-hand half into view at all: focusing an ancestor does
 * not let arrow keys drive a descendant scroller. WCAG 2.1.1, and axe's
 * scrollable-region-focusable rule.
 */
function scrollContainers(html: string) {
  return [...html.matchAll(/<div([^>]*overflow-x-auto[^>]*)>/g)].map(
    (match) => match[1],
  );
}

test("every horizontal scroll container is focusable and named", () => {
  const score = persisted(scoreFor("D", "S"));
  const html = renderToStaticMarkup(
    <DiscProfileReport patternDetail={null} score={score} />,
  );
  const containers = scrollContainers(html);

  // Three graph panels all render, plus the dimension table.
  assert.equal(
    containers.length,
    4,
    "expected one scroller per graph panel plus the dimension table",
  );

  for (const attributes of containers) {
    assert.match(attributes, /tabindex="0"/, `not focusable: ${attributes}`);
    assert.match(attributes, /role="group"/, `unnamed role: ${attributes}`);
    assert.match(
      attributes,
      /aria-label="[^"]+"/,
      `no accessible name: ${attributes}`,
    );
    // A tab stop the reader cannot see is worse than none.
    assert.match(
      attributes,
      /focus-visible:outline-2/,
      `no visible focus indicator: ${attributes}`,
    );
  }
});

/* ------------------------------------------------------------------ */
/* The figure                                                          */
/* ------------------------------------------------------------------ */

function perceivedGraph(score: DiscScoreOutput): DiscGraph {
  const graph = score.result.graphs.find(
    (candidate) => candidate.key === "perceived",
  );

  assert.ok(graph, "the perceived graph must exist");

  return graph;
}

function polylines(html: string): string[] {
  return [...html.matchAll(/<polyline[^>]*points="([^"]*)"/g)].map(
    (match) => match[1],
  );
}

test("plots one unbroken line through four recorded intensities", () => {
  const score = persisted(scoreFor("D", "S"));
  const graph = perceivedGraph(score);
  const html = renderToStaticMarkup(<DiscGraphFigure graph={graph} />);
  const lines = polylines(html);

  assert.equal(lines.length, 1, "four plotted points are one run");
  assert.equal(
    lines[0].split(" ").length,
    4,
    "every dimension must be on the line",
  );

  // Height is the intensity, linear with 1 at the bottom: y = 622 - (i - 0.5) * 18.
  const expected = graph.points.map((point) => {
    const index = ["D", "I", "S", "C"].indexOf(point.code);
    return `${96 + 80 * index + 40},${622 - (point.intensity - 0.5) * 18}`;
  });

  assert.deepEqual(lines[0].split(" "), expected);
});

test("breaks the line rather than drawing across a column with no height", () => {
  // A payload whose points do not all carry an intensity satisfies the score type
  // guard, which checks the segment and not the intensity. One polyline over
  // whatever remains would run straight across the gap and show a reader two
  // heights that were never scored - the one failure on this figure that
  // misinforms rather than merely omits.
  const score = persisted(scoreFor("D", "S"));
  const graph = perceivedGraph(score);

  for (const point of graph.points) {
    if (point.code === "I" || point.code === "S") {
      delete (point as { intensity?: number }).intensity;
    }
  }

  const html = renderToStaticMarkup(<DiscGraphFigure graph={graph} />);

  assert.deepEqual(
    polylines(html),
    [],
    "two isolated points must not be joined across the two columns between them",
  );
  assert.match(
    html,
    /aria-label="[^"]*intensity not recorded[^"]*"/,
    "the description must say which columns have no height",
  );
  // The segments are still known, so the strip below still prints all four.
  assert.ok(
    html.includes(graph.segmentLabel),
    "the segment tuple is unaffected by a missing intensity",
  );
});

test("refuses to plot an intensity outside the 1 to 28 scale", () => {
  const score = persisted(scoreFor("C", "I"));
  const graph = perceivedGraph(score);
  const target = graph.points.find((point) => point.code === "C");

  assert.ok(target);
  // 40 has no height on this figure: it would land outside the viewBox. 0 would
  // land inside the segment-number strip below the plot.
  target.intensity = 40;

  const html = renderToStaticMarkup(<DiscGraphFigure graph={graph} />);

  assert.equal(
    polylines(html).length,
    1,
    "the three plottable points still form one run",
  );
  assert.equal(
    polylines(html)[0].split(" ").length,
    3,
    "the out-of-range point must not be on the line",
  );
  assert.match(
    html,
    /aria-label="[^"]*intensity 40, outside the 1 to 28 scale, so not plotted[^"]*"/,
    "an out-of-range intensity must be reported as what it is, not as missing",
  );
});

test("the figure's description carries every number the drawing shows", () => {
  const score = persisted(scoreFor("I", "C"));

  for (const graph of score.result.graphs) {
    const html = renderToStaticMarkup(<DiscGraphFigure graph={graph} />);
    // The SVG's own label, not the scroll container's, which also has one.
    const label = /<svg\b[^>]*?aria-label="([^"]*)"/.exec(html)?.[1] ?? "";

    assert.ok(label.length > 0, `${graph.key} figure has no description`);

    // role="img" hides the drawing's own text, so this string is the whole
    // dataset for a screen-reader user.
    assert.match(html, /role="img"/);

    for (const point of graph.points) {
      assert.ok(
        label.includes(`intensity ${point.intensity} of 28`),
        `${graph.key}/${point.code} intensity missing from the description`,
      );
      assert.ok(
        label.includes(`segment ${point.segment} of 7`),
        `${graph.key}/${point.code} segment missing from the description`,
      );
    }

    assert.ok(label.includes(graph.segmentLabel));
    // The pattern name is never presented as the DiSC Classic classical pattern.
    assert.ok(
      label.includes("not a DiSC Classic classical pattern"),
      `${graph.key} must name whose derivation the pattern is`,
    );

    // Graph II's inversion is stated wherever its numbers appear, because a
    // Least tally of 1 next to segment 7 otherwise reads as a contradiction.
    assert.equal(
      label.includes("inverted"),
      graph.key === "private",
      `${graph.key} inversion note`,
    );
  }
});

test("the segment readout names each dimension in full", () => {
  const score = persisted(scoreFor("S", "D"));
  const graph = perceivedGraph(score);
  const html = renderToStaticMarkup(<DiscSegmentReadout graph={graph} />);

  for (const label of [
    "Dominance",
    "Influence",
    "Steadiness",
    "Conscientiousness",
  ]) {
    assert.ok(html.includes(label), `${label} must be spelled out`);
  }

  assert.ok(html.includes(graph.segmentLabel));
});

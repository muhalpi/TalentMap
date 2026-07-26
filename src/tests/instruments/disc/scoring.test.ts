import assert from "node:assert/strict";
import test from "node:test";

import type { AnswerMap, ScoreOutput } from "@/tests/shared/types";

import { bfiQuestions } from "../bfi/questions";
import { scoreBfiAnswers } from "../bfi/scoring";
import {
  discDimensionProfiles,
  discGraphMeta,
  discPatternProfiles,
} from "./profiles";
import { discQuestions } from "./questions";
import { isDiscScoreOutput } from "./result";
import { scoreDiscAnswers } from "./scoring";
import {
  discIntensityBands,
  discIntensityFor,
  discSegmentBands,
  discSegmentFor,
  discSegmentForIntensity,
} from "./segments";
import { discTermGroups, discTermPositions } from "./terms";
import type { DiscTermGroup, DiscTermPosition } from "./terms";
import type {
  DiscDimensionCode,
  DiscGraphKey,
  DiscPatternKey,
  DiscScoreOutput,
} from "./types";

const codes: DiscDimensionCode[] = ["D", "I", "S", "C"];
const graphKeys: DiscGraphKey[] = ["public", "private", "perceived"];
const patternKeys: DiscPatternKey[] = [
  "D",
  "I",
  "S",
  "C",
  "DI",
  "DS",
  "DC",
  "ID",
  "IS",
  "IC",
  "SD",
  "SI",
  "SC",
  "CD",
  "CI",
  "CS",
  "balanced",
];

// Every answer set below is built from the item bank rather than transcribed, so
// a change to the bank cannot silently invalidate a fixture. A "plan" names one
// dimension per group; answersFrom then looks up whichever position carries that
// dimension in that group.
type DiscPlan = DiscDimensionCode[];

function blockPlan(blocks: Array<[DiscDimensionCode, number]>): DiscPlan {
  const plan = blocks.flatMap(([code, count]) =>
    Array.from({ length: count }, () => code),
  );

  assert.equal(
    plan.length,
    discTermGroups.length,
    "a plan must name exactly one dimension for each of the 28 groups",
  );

  return plan;
}

function uniformPlan(code: DiscDimensionCode): DiscPlan {
  return blockPlan([[code, discTermGroups.length]]);
}

function positionFor(
  group: DiscTermGroup,
  code: DiscDimensionCode,
): DiscTermPosition {
  const term = group.terms.find((candidate) => candidate.dimension === code);

  assert.ok(term, `group ${group.group} has no ${code} term`);

  return term.position;
}

function answersFrom(mostPlan: DiscPlan, leastPlan: DiscPlan): AnswerMap {
  const answers: AnswerMap = {};

  discTermGroups.forEach((group, index) => {
    const slug = `g${String(group.group).padStart(2, "0")}`;
    answers[`${slug}m`] = positionFor(group, mostPlan[index]);
    answers[`${slug}l`] = positionFor(group, leastPlan[index]);
  });

  return answers;
}

function scoreOf(mostPlan: DiscPlan, leastPlan: DiscPlan): DiscScoreOutput {
  return scoreDiscAnswers(answersFrom(mostPlan, leastPlan));
}

type DimensionTotals = Record<DiscDimensionCode, number>;

function totalsOf(
  score: DiscScoreOutput,
  field:
    | "mostScore"
    | "leastScore"
    | "changeScore"
    | "publicSegment"
    | "privateSegment"
    | "segment"
    | "scorePercent",
): DimensionTotals {
  const totals: DimensionTotals = { D: 0, I: 0, S: 0, C: 0 };

  for (const dimension of score.summary.dimensions) {
    totals[dimension.code] = dimension[field];
  }

  return totals;
}

/** Groups in which picking this dimension's term actually scores on this side. */
function keyedGroupCount(
  code: DiscDimensionCode,
  side: "mostKey" | "leastKey",
): number {
  return discTermGroups.filter((group) =>
    group.terms.some(
      (term) => term.dimension === code && term[side] !== null,
    ),
  ).length;
}

test("presents the 28-group, 112-adjective bank with one term per dimension", () => {
  assert.equal(discTermGroups.length, 28);
  assert.deepEqual(
    discTermGroups.map((group) => group.group),
    Array.from({ length: 28 }, (_, index) => index + 1),
  );

  const terms = discTermGroups.flatMap((group) => group.terms);
  assert.equal(terms.length, 112);

  const labels = terms.map((term) => term.term);
  assert.equal(new Set(labels).size, 112, "every adjective must be distinct");
  assert.equal(
    new Set(labels.map((label) => label.toLowerCase())).size,
    112,
    "adjectives must not differ only by capitalisation",
  );

  for (const group of discTermGroups) {
    assert.equal(group.terms.length, 4);
    assert.deepEqual(
      group.terms.map((term) => term.position),
      discTermPositions,
      `group ${group.group} must list positions A-D in display order`,
    );
    assert.deepEqual(
      [...group.terms.map((term) => term.dimension)].sort(),
      [...codes].sort(),
      `group ${group.group} must map one-to-one onto D, I, S and C`,
    );
  }
});

// The word-to-dimension mapping is the one part of the item bank that was
// reconstructed rather than transcribed - the operator's export stores the
// adjectives as placeholders, so nothing in the source fixes which of a group's
// four words carries which dimension (see the provenance note in terms.ts).
// Moving a single word between two dimensions changes the pattern a respondent is
// reported as having, so every assignment is pinned here: a change to one shows
// up as an explicit diff on this list instead of silently rescoring everybody.
const pinnedBank: string[][] = [
  ["Cheerful I", "Reserved C", "Obliging S", "Strong-willed D"],
  ["Firm D", "Playful I", "Obedient S", "Fussy C"],
  ["Dominant D", "Conscientious C", "Responsive S", "Expressive I"],
  ["Compliant C", "Captivating I", "Demanding D", "Contented S"],
  ["Poised I", "Modest S", "Observant C", "Impatient D"],
  ["Predictable S", "Stubborn D", "Introspective C", "Attractive I"],
  ["Cautious C", "Good Natured S", "Determined D", "Convincing I"],
  ["Helpful S", "Pioneering D", "Respectful C", "Optimistic I"],
  ["Neighborly S", "Careful C", "Appealing I", "Restless D"],
  ["Original D", "Gentle S", "Humble C", "Persuasive I"],
  ["Jovial I", "Precise C", "Even-tempered S", "Direct D"],
  ["Bold D", "Loyal S", "Charming I", "Logical C"],
  ["Impulsive I", "Forceful D", "Easy-going S", "Introverted C"],
  ["Perceptive C", "Independent D", "Stimulating I", "Kind S"],
  ["Light-hearted I", "Argumentative D", "Systematic C", "Cooperative S"],
  ["Aggressive D", "Fearful C", "Amiable S", "Extroverted I"],
  ["Adventurous D", "Insightful C", "Out-going I", "Moderate S"],
  ["Refined C", "Good mixer I", "Vigorous D", "Lenient S"],
  ["Generous S", "Animated I", "Persistent D", "Well-disciplined C"],
  ["Sympathetic S", "Confident I", "Impartial C", "Assertive D"],
  ["Magnetic I", "Agreeable S", "Insistent D", "Tactful C"],
  ["Outspoken D", "Calm S", "Friendly I", "Accurate C"],
  ["Competitive D", "Private C", "Joyful I", "Considerate S"],
  ["Sociable I", "Self-reliant D", "Patient S", "Soft spoken C"],
  ["Timid C", "Submissive S", "Inspiring I", "Brave D"],
  ["Conventional C", "Decisive D", "Controlled S", "Talkative I"],
  ["Enthusiastic I", "Daring D", "Diplomatic C", "Satisfied S"],
  ["Thorough C", "High-spirited I", "Willing S", "Eager D"],
];

test("pins every adjective, its display position, and its derived dimension", () => {
  assert.deepEqual(
    discTermGroups.map((group) =>
      group.terms.map((term) => `${term.term} ${term.dimension}`),
    ),
    pinnedBank,
  );

  // Each dimension is claimed by exactly one word in each of the 28 groups, so
  // every dimension is used exactly 28 times across the bank.
  for (const code of codes) {
    assert.equal(
      discTermGroups.flatMap((group) => group.terms).filter(
        (term) => term.dimension === code,
      ).length,
      28,
      `${code} must be carried by exactly one word per group`,
    );
  }
});

test("ships the corrected spellings and none of the source misspellings", () => {
  const labels = new Set(
    discTermGroups.flatMap((group) => group.terms).map((term) => term.term),
  );

  // The operator's item bank contains six misspellings. The corrected form is
  // what respondents see; the original must never be shipped.
  const corrections: Array<[string, string]> = [
    ["Inpatient", "Impatient"],
    ["Instropective", "Introspective"],
    ["Convicing", "Convincing"],
    ["Well-desciplined", "Well-disciplined"],
    ["Enthuastic", "Enthusiastic"],
    ["Wiling", "Willing"],
  ];

  for (const [misspelling, corrected] of corrections) {
    assert.ok(labels.has(corrected), `${corrected} must be in the bank`);
    assert.ok(
      !labels.has(misspelling),
      `${misspelling} is the source misspelling and must not ship`,
    );
  }
});

test("keys every term to its own dimension except the 13 asymmetric slots", () => {
  const asymmetric = discTermGroups.flatMap((group) =>
    group.terms
      .filter((term) => term.mostKey === null || term.leastKey === null)
      .map((term) => ({
        group: group.group,
        dimension: term.dimension,
        mostKey: term.mostKey,
        leastKey: term.leastKey,
      })),
  );

  // The exception table is part of the licensed instrument: a slot scores on one
  // side only, and which side it is matters. Assert the exact set, not the count.
  assert.deepEqual(asymmetric, [
    { group: 2, dimension: "I", mostKey: "I", leastKey: null },
    { group: 3, dimension: "C", mostKey: "C", leastKey: null },
    { group: 3, dimension: "I", mostKey: null, leastKey: "I" },
    { group: 6, dimension: "S", mostKey: null, leastKey: "S" },
    { group: 6, dimension: "D", mostKey: null, leastKey: "D" },
    { group: 6, dimension: "C", mostKey: "C", leastKey: null },
    { group: 7, dimension: "I", mostKey: null, leastKey: "I" },
    { group: 8, dimension: "S", mostKey: "S", leastKey: null },
    { group: 10, dimension: "S", mostKey: null, leastKey: "S" },
    { group: 15, dimension: "S", mostKey: "S", leastKey: null },
    { group: 18, dimension: "D", mostKey: "D", leastKey: null },
    { group: 19, dimension: "S", mostKey: null, leastKey: "S" },
    { group: 20, dimension: "S", mostKey: null, leastKey: "S" },
  ]);
  assert.equal(asymmetric.length, 13);

  // No slot is keyed to a dimension other than its own, and only one side of any
  // asymmetric slot is ever null.
  for (const group of discTermGroups) {
    for (const term of group.terms) {
      if (term.mostKey !== null) {
        assert.equal(term.mostKey, term.dimension);
      }

      if (term.leastKey !== null) {
        assert.equal(term.leastKey, term.dimension);
      }

      assert.ok(
        term.mostKey !== null || term.leastKey !== null,
        `group ${group.group} ${term.dimension} would score on neither side`,
      );
    }
  }
});

test("reaches the exact maxima the asymmetric keying implies", () => {
  // Picking one dimension's term as MOST in all 28 groups maximises its Most
  // tally; doing the same on the LEAST side maximises its Least tally. Because
  // some slots score on one side only, neither maximum is 28, and the two
  // maxima for a dimension can differ.
  const mostMaxima: DimensionTotals = { D: 27, I: 26, S: 24, C: 28 };
  const leastMaxima: DimensionTotals = { D: 27, I: 27, S: 26, C: 26 };

  for (const code of codes) {
    const score = scoreOf(uniformPlan(code), uniformPlan(code));

    assert.equal(
      totalsOf(score, "mostScore")[code],
      mostMaxima[code],
      `Most maximum for ${code}`,
    );
    assert.equal(
      totalsOf(score, "leastScore")[code],
      leastMaxima[code],
      `Least maximum for ${code}`,
    );

    // Same maxima, re-derived from the bank rather than from the scorer, so the
    // published norm ranges and the keying cannot drift apart.
    assert.equal(keyedGroupCount(code, "mostKey"), mostMaxima[code]);
    assert.equal(keyedGroupCount(code, "leastKey"), leastMaxima[code]);
  }
});

test("reaches the full change-score range for every dimension", () => {
  // Most on one dimension and Least on another that never keys the first drives
  // the change score to its arithmetic limit.
  const extremes: Array<{
    code: DiscDimensionCode;
    most: DiscDimensionCode;
    least: DiscDimensionCode;
    changeScore: number;
  }> = [
    { code: "D", most: "D", least: "I", changeScore: 27 },
    { code: "D", most: "I", least: "D", changeScore: -27 },
    { code: "I", most: "I", least: "S", changeScore: 26 },
    { code: "I", most: "S", least: "I", changeScore: -27 },
    { code: "S", most: "S", least: "D", changeScore: 24 },
    { code: "S", most: "D", least: "S", changeScore: -26 },
    { code: "C", most: "C", least: "D", changeScore: 28 },
    { code: "C", most: "D", least: "C", changeScore: -26 },
  ];

  for (const extreme of extremes) {
    const score = scoreOf(
      uniformPlan(extreme.most),
      uniformPlan(extreme.least),
    );

    assert.equal(
      totalsOf(score, "changeScore")[extreme.code],
      extreme.changeScore,
      `change score for ${extreme.code} with Most ${extreme.most} / Least ${extreme.least}`,
    );
  }
});

test("presents each group as a MOST and a LEAST question over the same options", () => {
  assert.equal(discQuestions.length, 56);
  assert.equal(
    new Set(discQuestions.map((question) => question.id)).size,
    56,
  );
  assert.deepEqual(
    discQuestions.map((question) => question.no),
    Array.from({ length: 56 }, (_, index) => index + 1),
  );

  for (const group of discTermGroups) {
    const slug = `g${String(group.group).padStart(2, "0")}`;
    const most = discQuestions.find(
      (question) => question.id === `${slug}m`,
    );
    const least = discQuestions.find(
      (question) => question.id === `${slug}l`,
    );

    assert.ok(most, `missing MOST question for group ${group.group}`);
    assert.ok(least, `missing LEAST question for group ${group.group}`);

    assert.equal(most.no, group.group * 2 - 1);
    assert.equal(least.no, group.group * 2);
    assert.equal(most.kind, "most");
    assert.equal(least.kind, "least");
    assert.equal(
      most.prompt,
      `Group ${group.group} of 28 - which word describes you MOST?`,
    );
    assert.equal(
      least.prompt,
      `Group ${group.group} of 28 - which word describes you LEAST?`,
    );

    // Both sides of a group must offer the same four words in the same order,
    // otherwise a Most and a Least answer of "B" would not name the same term.
    assert.deepEqual(most.options, least.options);
    assert.deepEqual(
      most.options,
      group.terms.map((term) => ({ value: term.position, label: term.term })),
    );
  }

  // The XLSX import parser uppercases answer cells, so option values must be
  // uppercase A-D or imported responses would not match.
  for (const question of discQuestions) {
    assert.deepEqual(
      question.options.map((option) => option.value),
      discTermPositions,
    );

    for (const option of question.options) {
      assert.match(option.value, /^[A-D]$/);
      assert.ok(option.label.length > 0);
    }
  }
});

test("covers segments 1 to 7 with contiguous, non-overlapping bands", () => {
  for (const graph of graphKeys) {
    for (const code of codes) {
      const bands = discSegmentBands[graph][code];
      const label = `${graph}/${code}`;

      assert.deepEqual(
        [...bands.map((band) => band.segment)].sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6, 7],
        `${label} must define segments 1-7 exactly once each`,
      );

      const ordered = [...bands].sort((a, b) => a.min - b.min);

      for (const band of ordered) {
        assert.ok(
          band.min <= band.max,
          `${label} segment ${band.segment} has an inverted range`,
        );
      }

      for (let index = 0; index < ordered.length - 1; index += 1) {
        assert.equal(
          ordered[index + 1].min,
          ordered[index].max + 1,
          `${label} has a gap or overlap between segments ${ordered[index].segment} and ${ordered[index + 1].segment}`,
        );
      }
    }
  }
});

test("transcribes the whole intensity table as contiguous, open-ended rows", () => {
  // The source `results` table has 202 rows. Two of them share an intensity with
  // their neighbour (graph2/D at intensity 27, graph3/D at intensity 23), which
  // merges into a single band, so a complete transcription is 200 bands. These
  // counts are the guard against a truncated or over-eager transcription: a row
  // silently losing entries would still look contiguous.
  const expectedBandCounts: Record<DiscGraphKey, Record<DiscDimensionCode, number>> =
    {
      public: { D: 14, I: 16, S: 14, C: 14 },
      private: { D: 18, I: 12, S: 15, C: 12 },
      perceived: { D: 24, I: 22, S: 20, C: 19 },
    };

  let total = 0;

  for (const graph of graphKeys) {
    for (const code of codes) {
      const bands = discIntensityBands[graph][code];
      const label = `${graph}/${code}`;

      assert.equal(
        bands.length,
        expectedBandCounts[graph][code],
        `${label} band count`,
      );
      total += bands.length;

      // Every intensity is a distinct integer in 1..28, so nothing can resolve to
      // two heights and no band sits off the graph's axis.
      const intensities = bands.map((band) => band.intensity);
      assert.equal(
        new Set(intensities).size,
        bands.length,
        `${label} repeats an intensity in two separate bands`,
      );

      for (const band of bands) {
        assert.ok(
          Number.isInteger(band.intensity) &&
            band.intensity >= 1 &&
            band.intensity <= 28,
          `${label} has intensity ${band.intensity} outside 1-28`,
        );
        assert.ok(band.min <= band.max, `${label} band ${band.intensity} inverted`);
      }

      // The row covers the whole number line with no gap and no overlap, so every
      // arithmetically reachable score resolves to exactly one intensity.
      assert.equal(bands[0].min, -Infinity, `${label} first band is not open`);
      assert.equal(
        bands[bands.length - 1].max,
        Infinity,
        `${label} last band is not open`,
      );

      for (let index = 1; index < bands.length; index += 1) {
        assert.equal(
          bands[index].min,
          bands[index - 1].max + 1,
          `${label} has a gap or overlap before intensity ${bands[index].intensity}`,
        );
      }

      // Intensity moves monotonically with value, downwards only on the inverted
      // private graph. A break here would mean a mis-sorted transcription.
      for (let index = 1; index < bands.length; index += 1) {
        if (graph === "private") {
          assert.ok(
            bands[index].intensity < bands[index - 1].intensity,
            `${label} intensity must fall as the Least tally rises`,
          );
        } else {
          assert.ok(
            bands[index].intensity > bands[index - 1].intensity,
            `${label} intensity must rise with the value`,
          );
        }
      }

      // The source's own segment column equalled ceil(intensity / 4) on all 202
      // rows, and every row spans all seven segments.
      assert.deepEqual(
        [...new Set(intensities.map(discSegmentForIntensity))].sort(
          (a, b) => a - b,
        ),
        [1, 2, 3, 4, 5, 6, 7],
        `${label} must reach every segment`,
      );
    }
  }

  assert.equal(total, 200, "the full table is 202 source rows, 2 of them merged");
});

test("derives the segment from the intensity in bands of four", () => {
  // segment === ceil(intensity / 4). Pinned at every boundary rather than
  // restated as the same formula, so a change to the banding has to be explicit.
  const expected: Array<[number, number]> = [
    [1, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [9, 3],
    [12, 3],
    [13, 4],
    [16, 4],
    [17, 5],
    [20, 5],
    [21, 6],
    [24, 6],
    [25, 7],
    [28, 7],
  ];

  for (const [intensity, segment] of expected) {
    assert.equal(
      discSegmentForIntensity(intensity),
      segment,
      `intensity ${intensity}`,
    );
  }

  // Clamped at both ends so an out-of-table intensity cannot produce segment 0
  // or segment 8.
  assert.equal(discSegmentForIntensity(0), 1);
  assert.equal(discSegmentForIntensity(-5), 1);
  assert.equal(discSegmentForIntensity(29), 7);
  assert.equal(discSegmentForIntensity(400), 7);

  // discSegmentFor is that composition and nothing else.
  for (const graph of graphKeys) {
    for (const code of codes) {
      for (let value = -30; value <= 30; value += 1) {
        assert.equal(
          discSegmentFor(graph, code, value),
          discSegmentForIntensity(discIntensityFor(graph, code, value)),
          `${graph}/${code} value ${value}`,
        );
      }
    }
  }
});

test("converts raw scores to the intensities the instrument's own table gives", () => {
  // Spot values read straight off the source `results` table. They are the guard
  // on the transcription itself: the contiguity checks above would still pass on
  // a table whose intensities were all shifted.
  const spots: Array<[DiscGraphKey, DiscDimensionCode, number, number]> = [
    // public/D is the one row that bottoms out above intensity 1.
    ["public", "D", 0, 3],
    ["public", "D", 11, 25],
    ["public", "D", 27, 28],
    ["public", "C", 0, 1],
    ["public", "C", 28, 28],
    ["public", "I", 8, 15],
    // private is inverted: no LEAST picks is the top of the graph.
    ["private", "D", 0, 28],
    ["private", "D", 10, 14],
    ["private", "D", 27, 1],
    // the two merged bands, where one intensity spans two source values.
    ["private", "D", 1, 27],
    ["private", "D", 2, 27],
    ["perceived", "D", 2, 23],
    ["perceived", "D", 3, 23],
    ["perceived", "I", 0, 9],
    ["perceived", "C", 0, 12],
  ];

  for (const [graph, code, value, intensity] of spots) {
    assert.equal(
      discIntensityFor(graph, code, value),
      intensity,
      `${graph}/${code} value ${value}`,
    );
  }

  // A change score of zero is not the middle of the graph, and it is not even the
  // same intensity on two dimensions - the conversion tables are per dimension
  // and are not symmetric about zero.
  assert.equal(discIntensityFor("perceived", "D", 0), 21);
  assert.equal(discIntensityFor("perceived", "S", 0), 18);
  assert.notEqual(
    discIntensityFor("perceived", "D", 0),
    discIntensityFor("perceived", "C", 0),
  );
});

test("plots two dimensions of one segment at two different intensities", () => {
  // This is the reason the intensity is kept at all. On the perceived graph a
  // change score of +5 on Influence and +1 on Conscientiousness both land in
  // segment 4, but at intensity 15 and intensity 14 - so they are two different
  // heights on the graph, and a segment-only table could not tell them apart.
  const influence = discIntensityFor("perceived", "I", 5);
  const conscientiousness = discIntensityFor("perceived", "C", 1);

  assert.equal(influence, 15);
  assert.equal(conscientiousness, 14);
  assert.notEqual(influence, conscientiousness);
  assert.equal(discSegmentForIntensity(influence), 4);
  assert.equal(discSegmentForIntensity(conscientiousness), 4);
});

test("resolves every arithmetically reachable value to one segment", () => {
  for (const graph of graphKeys) {
    for (const code of codes) {
      for (let value = -30; value <= 30; value += 1) {
        const segment = discSegmentFor(graph, code, value);

        assert.ok(
          Number.isInteger(segment) && segment >= 1 && segment <= 7,
          `${graph}/${code} value ${value} resolved to ${segment}`,
        );
      }
    }
  }
});

test("keeps the private graph inverted, so a low Least tally reads high", () => {
  for (const code of codes) {
    const rarelyRejected = discSegmentFor("private", code, 0);
    const oftenRejected = discSegmentFor("private", code, 20);

    assert.equal(rarelyRejected, 7, `private/${code} at a Least tally of 0`);
    assert.equal(oftenRejected, 1, `private/${code} at a Least tally of 20`);
    assert.ok(rarelyRejected > oftenRejected);
  }

  // The other two graphs run the usual way round, which is what makes the
  // inversion worth pinning down.
  for (const code of codes) {
    assert.ok(
      discSegmentFor("public", code, 20) > discSegmentFor("public", code, 0),
      `public/${code} should not be inverted`,
    );
  }
});

test("gives a D-maximising response set the D pattern at the top segment", () => {
  // Every MOST pick is the Dominance term and every LEAST pick is the Steadiness
  // term, which drives D to its Most maximum while keeping I, S and C off the
  // elevated threshold.
  const score = scoreOf(uniformPlan("D"), uniformPlan("S"));

  assert.equal(score.summary.patternKey, "D");
  assert.equal(score.summary.primary, "D");
  assert.equal(score.summary.secondary, null);
  assert.equal(score.summary.label, `${discPatternProfiles.D.name} (D)`);
  assert.equal(score.result.primaryDimension, "dominance");
  assert.equal(score.result.secondaryDimension, null);

  assert.deepEqual(totalsOf(score, "mostScore"), { D: 27, I: 0, S: 0, C: 0 });
  assert.deepEqual(totalsOf(score, "leastScore"), { D: 0, I: 0, S: 26, C: 0 });
  assert.deepEqual(totalsOf(score, "changeScore"), {
    D: 27,
    I: 0,
    S: -26,
    C: 0,
  });
  assert.deepEqual(score.summary.segments, { D: 7, I: 3, S: 1, C: 3 });

  const dominance = score.summary.dimensions.find(
    (dimension) => dimension.code === "D",
  );
  assert.ok(dominance);
  assert.equal(dominance.segment, 7);
  assert.equal(dominance.publicSegment, 7);
  assert.equal(dominance.band, "high");
  assert.equal(dominance.scorePercent, 100);

  const steadiness = score.summary.dimensions.find(
    (dimension) => dimension.code === "S",
  );
  assert.ok(steadiness);
  assert.equal(steadiness.segment, 1);
  assert.equal(steadiness.band, "low");
  assert.equal(steadiness.scorePercent, 0);

  // Only one dimension is elevated, so exactly one dimension profile is high.
  assert.equal(
    score.result.dimensionProfiles.filter(
      (profile) => profile.band === "high",
    ).length,
    1,
  );

  // The three graphs must plot the three tallies they are named for.
  const graphs = new Map(score.result.graphs.map((graph) => [graph.key, graph]));
  assert.deepEqual([...graphs.keys()], graphKeys);

  for (const [key, field] of [
    ["public", "mostScore"],
    ["private", "leastScore"],
    ["perceived", "changeScore"],
  ] as const) {
    const graph = graphs.get(key);
    assert.ok(graph);
    assert.equal(graph.points.length, 4);
    assert.deepEqual(
      graph.points.map((point) => point.value),
      score.summary.dimensions.map((dimension) => dimension[field]),
    );
    assert.deepEqual(
      graph.points.map((point) => point.code),
      score.summary.dimensions.map((dimension) => dimension.code),
    );
  }
});

test("gives every graph its own intensities, segment tuple, and derived pattern", () => {
  const score = scoreOf(uniformPlan("D"), uniformPlan("S"));
  const graphs = new Map(score.result.graphs.map((graph) => [graph.key, graph]));

  assert.deepEqual([...graphs.keys()], graphKeys);

  for (const key of graphKeys) {
    const graph = graphs.get(key);
    assert.ok(graph);

    // Four points, one per dimension, and a segment record keyed by all four -
    // both of which a graph component indexes into without checking.
    assert.equal(graph.points.length, 4, `${key} must plot four points`);
    assert.deepEqual(
      [...graph.points.map((point) => point.code)].sort(),
      ["C", "D", "I", "S"],
      `${key} must plot each dimension exactly once`,
    );
    assert.deepEqual(
      [...Object.keys(graph.segments)].sort(),
      ["C", "D", "I", "S"],
      `${key} must carry a segment for each dimension`,
    );

    for (const point of graph.points) {
      // Height and band are two readings of one number, so they cannot disagree.
      assert.ok(
        Number.isInteger(point.intensity) &&
          point.intensity >= 1 &&
          point.intensity <= 28,
        `${key}/${point.code} intensity ${point.intensity} outside 1-28`,
      );
      assert.equal(
        point.segment,
        discSegmentForIntensity(point.intensity),
        `${key}/${point.code} segment does not follow its intensity`,
      );
      assert.equal(
        point.intensity,
        discIntensityFor(key, point.code, point.value),
        `${key}/${point.code} intensity does not follow its plotted value`,
      );

      // The graph's own segment record agrees with its own points.
      assert.equal(graph.segments[point.code], point.segment);
    }

    // The label is the four segments in D-I-S-C order, whatever order the points
    // happen to be listed in.
    assert.equal(
      graph.segmentLabel,
      [graph.segments.D, graph.segments.I, graph.segments.S, graph.segments.C].join(
        "-",
      ),
    );
    assert.match(graph.segmentLabel, /^[1-7]-[1-7]-[1-7]-[1-7]$/);

    // Every graph names a pattern of its own, and the name always matches the key
    // it was derived from. It is TalentMap's derivation, not a DiSC Classic
    // classical-pattern name.
    assert.ok(
      patternKeys.includes(graph.patternKey),
      `${key} derived an unknown pattern key ${graph.patternKey}`,
    );
    assert.equal(
      graph.patternName,
      discPatternProfiles[graph.patternKey].name,
      `${key} pattern name does not match its key`,
    );
  }

  const perceived = graphs.get("perceived");
  assert.ok(perceived);

  // The summary is the perceived graph's reading, so the two must never diverge.
  assert.equal(perceived.patternKey, score.summary.patternKey);
  assert.deepEqual(perceived.segments, score.summary.segments);
  assert.equal(perceived.segmentLabel, "7-3-1-3");

  // Every MOST pick is Dominance and every LEAST pick is Steadiness, so the
  // public graph reads as D alone while the private graph reads high on the three
  // dimensions that were never rejected. The three graphs are not required to
  // agree, and here they do not.
  const publicGraph = graphs.get("public");
  assert.ok(publicGraph);
  assert.equal(publicGraph.segmentLabel, "7-1-1-1");
  assert.equal(publicGraph.patternKey, "D");

  const privateGraph = graphs.get("private");
  assert.ok(privateGraph);
  assert.equal(privateGraph.segments.S, 1, "Steadiness was rejected 26 times");
  assert.equal(privateGraph.segments.D, 7, "Dominance was never rejected");

  // The dimension profiles carry the same three intensities the graphs plot.
  for (const profile of score.result.dimensionProfiles) {
    assert.equal(
      profile.publicIntensity,
      discIntensityFor("public", profile.code, profile.mostScore),
    );
    assert.equal(
      profile.privateIntensity,
      discIntensityFor("private", profile.code, profile.leastScore),
    );
    assert.equal(
      profile.intensity,
      discIntensityFor("perceived", profile.code, profile.changeScore),
    );
    assert.equal(profile.segment, discSegmentForIntensity(profile.intensity));
    assert.equal(
      profile.publicSegment,
      discSegmentForIntensity(profile.publicIntensity),
    );
    assert.equal(
      profile.privateSegment,
      discSegmentForIntensity(profile.privateIntensity),
    );
  }
});

/**
 * The response set that reproduces the Graph III in the operator's own report.
 *
 * Their printed Graph III reads segment 6-4-2-4 with Dominance plotted at
 * intensity 23, Influence at 15, Steadiness at 7 and Conscientiousness at 14 -
 * so Influence and Conscientiousness share segment 4 while sitting one intensity
 * step apart. That tuple IS reachable from a valid response set; this is one, and
 * it was searched for against the scorer rather than hand-fitted. Every group has
 * a different dimension on each side, so nothing cancels out.
 */
const operatorMostPlan = blockPlan([
  ["S", 2],
  ["D", 4],
  ["C", 10],
  ["I", 12],
]);
const operatorLeastPlan = blockPlan([
  ["D", 1],
  ["I", 8],
  ["S", 10],
  ["C", 9],
]);

test("reproduces the 6-4-2-4 Graph III from the operator's own report", () => {
  const score = scoreOf(operatorMostPlan, operatorLeastPlan);
  const perceived = score.result.graphs.find(
    (graph) => graph.key === "perceived",
  );

  assert.ok(perceived);
  assert.equal(score.summary.ambiguousGroups, 0);

  // The tuple the report prints under the graph, and the same four numbers on
  // the summary the rest of the platform reads.
  assert.equal(perceived.segmentLabel, "6-4-2-4");
  assert.deepEqual(perceived.segments, { D: 6, I: 4, S: 2, C: 4 });
  assert.deepEqual(score.summary.segments, { D: 6, I: 4, S: 2, C: 4 });

  // Each point's plotted height, and the raw change score it converted from.
  const expected: Array<[DiscDimensionCode, number, number, number]> = [
    // code, change score, intensity, segment
    ["D", 2, 23, 6],
    ["I", 5, 15, 4],
    ["S", -7, 7, 2],
    ["C", 1, 14, 4],
  ];
  const points = new Map(perceived.points.map((point) => [point.code, point]));

  assert.equal(perceived.points.length, 4);

  for (const [code, changeScore, intensity, segment] of expected) {
    const point = points.get(code);

    assert.ok(point, `the perceived graph has no ${code} point`);
    assert.equal(point.value, changeScore, `${code} change score`);
    assert.equal(point.intensity, intensity, `${code} plotted intensity`);
    assert.equal(point.segment, segment, `${code} segment`);

    // The height sits inside the band the segment names, which is what makes the
    // dot land in the right stripe of the printed graph.
    assert.ok(
      intensity > (segment - 1) * 4 && intensity <= segment * 4,
      `${code} intensity ${intensity} is outside segment ${segment}`,
    );
  }

  // The whole reason the intensity is stored: Influence and Conscientiousness
  // are both segment 4, and the report draws them at two different heights.
  const influence = points.get("I");
  const conscientiousness = points.get("C");
  assert.ok(influence && conscientiousness);
  assert.equal(influence.segment, conscientiousness.segment);
  assert.notEqual(influence.intensity, conscientiousness.intensity);

  // The other two graphs are read from the same response set and are their own
  // readings, so they carry their own tuples rather than repeating this one.
  const publicGraph = score.result.graphs.find(
    (graph) => graph.key === "public",
  );
  const privateGraph = score.result.graphs.find(
    (graph) => graph.key === "private",
  );
  assert.ok(publicGraph && privateGraph);
  assert.equal(publicGraph.segmentLabel, "3-6-1-6");
  assert.equal(privateGraph.segmentLabel, "7-2-3-1");
});

test("names this tuple with TalentMap's own pattern, not a DiSC Classic one", () => {
  // The operator's report labels 6-4-2-4 "Result-Oriented", which is a DiSC
  // Classic classical-pattern name. That naming comes from a licensed pattern
  // table this codebase does not hold - the exported one is placeholders, and its
  // pattern_map is synthetic and maps 6-4-2-4 and 6-6-2-4 to the same pattern, so
  // it cannot reproduce the report. TalentMap therefore derives its own name from
  // the four segments and must present it as its own.
  const score = scoreOf(operatorMostPlan, operatorLeastPlan);
  const perceived = score.result.graphs.find(
    (graph) => graph.key === "perceived",
  );

  assert.ok(perceived);
  assert.ok(
    patternKeys.includes(perceived.patternKey),
    `derived an unknown pattern key ${perceived.patternKey}`,
  );
  assert.equal(
    perceived.patternName,
    discPatternProfiles[perceived.patternKey].name,
  );
  assert.equal(perceived.patternKey, score.summary.patternKey);

  // No TalentMap pattern may carry a DiSC Classic classical-pattern name, on this
  // tuple or on any other. Deriving a name is honest; borrowing that vocabulary
  // would present a derivation as the licensed classification.
  const classicalPatternNames = [
    "Achiever",
    "Agent",
    "Appraiser",
    "Counselor",
    "Creative",
    "Developer",
    "Inspirational",
    "Investigator",
    "Objective Thinker",
    "Overshift",
    "Perfectionist",
    "Persuader",
    "Practitioner",
    "Promoter",
    "Result-Oriented",
    "Specialist",
  ];

  for (const key of patternKeys) {
    const name = discPatternProfiles[key].name;

    for (const classical of classicalPatternNames) {
      assert.notEqual(
        name.toLowerCase(),
        classical.toLowerCase(),
        `pattern ${key} is named after the DiSC Classic pattern "${classical}"`,
      );
    }
  }
});

test("qualifies the summary label only when groups cancelled out", () => {
  // A clean result's label must stay byte-for-byte what it has always been:
  // resultLabel() in dashboard-service.ts groups results by this exact string to
  // build the analytics distribution chart, so a cosmetic change would split one
  // bucket into two.
  const clean = scoreOf(uniformPlan("D"), uniformPlan("S"));

  assert.equal(clean.summary.ambiguousGroups, 0);
  assert.equal(clean.summary.label, `${discPatternProfiles.D.name} (D)`);
  assert.doesNotMatch(clean.summary.label, /provisional/);

  // Every group cancelling itself out leaves every change score at zero, so the
  // pattern carries no information about the respondent. The label has to say so:
  // it is the only thing the results table, the participant history table and the
  // XLSX export show, and none of them has ambiguousGroups to hand.
  const answers = answersFrom(uniformPlan("D"), uniformPlan("D"));
  const empty = scoreDiscAnswers(answers);

  assert.equal(empty.summary.ambiguousGroups, 28);
  assert.deepEqual(totalsOf(empty, "changeScore"), { D: 0, I: 0, S: 0, C: 0 });
  assert.equal(
    empty.summary.label,
    `${discPatternProfiles[empty.summary.patternKey].name} (${empty.summary.patternKey}) - provisional (28/28 groups cancelled)`,
  );

  // A single cancelled group is qualified too, and reports its own count.
  const oneCancelled = { ...answersFrom(uniformPlan("D"), uniformPlan("S")) };
  oneCancelled["g09l"] = oneCancelled["g09m"];
  const partial = scoreDiscAnswers(oneCancelled);

  assert.equal(partial.summary.ambiguousGroups, 1);
  assert.match(partial.summary.label, / - provisional \(1\/28 groups cancelled\)$/);

  // Short enough for a table cell.
  for (const label of [empty.summary.label, partial.summary.label]) {
    assert.ok(label.length <= 80, `label is ${label.length} characters: ${label}`);
  }
});

test("states the intensity conversion in the methodology it publishes", () => {
  const score = scoreOf(uniformPlan("D"), uniformPlan("S"));

  // The report explains how a raw score becomes a height and a band. If the
  // scoring changes shape, this copy has to change with it.
  assert.match(
    score.interpretation.methodology,
    /intensity from 1 to 28/,
  );
  assert.match(score.interpretation.methodology, /bands of four/);
  assert.match(score.summary.scoringMethod, /intensity of 1–28/);
});

test("returns the balanced pattern when nothing reaches the elevated threshold", () => {
  // A deliberately mixed response set. The midlines differ per dimension, so a
  // flat profile is not simply an even split of picks.
  const score = scoreOf(
    blockPlan([
      ["I", 4],
      ["S", 12],
      ["C", 12],
    ]),
    blockPlan([
      ["S", 3],
      ["C", 11],
      ["D", 6],
      ["S", 8],
    ]),
  );

  assert.equal(score.summary.patternKey, "balanced");
  assert.equal(score.summary.primary, null);
  assert.equal(score.summary.secondary, null);
  assert.equal(score.result.primaryDimension, null);
  assert.equal(score.result.secondaryDimension, null);
  assert.equal(
    score.summary.label,
    `${discPatternProfiles.balanced.name} (balanced)`,
  );
  assert.deepEqual(score.summary.segments, { D: 4, I: 4, S: 4, C: 4 });

  for (const dimension of score.summary.dimensions) {
    assert.ok(
      dimension.segment < 5,
      `${dimension.code} should not be elevated in a balanced profile`,
    );
    assert.equal(dimension.band, "moderate");
  }

  assert.equal(score.summary.ambiguousGroups, 0);
  assert.match(
    score.interpretation.responseStyle,
    /no group cancelled itself out/,
  );
  // The clean wording must not overclaim: 13 adjectives score on one side only, so
  // even a flawless response does not put all 28 groups into both tallies.
  assert.doesNotMatch(
    score.interpretation.responseStyle,
    /all 28 groups contributed/,
  );
  assert.match(
    score.interpretation.responseStyle,
    /keyed to score on one side only/,
  );
});

test("orders a two-dimension pattern by which dimension leads", () => {
  // Same shape both ways: 21 groups pick the lead dimension as MOST, 7 pick the
  // support dimension, and every LEAST pick is Steadiness. Swapping which of D
  // and I is the lead must swap the two letters of the pattern.
  const leastPlan = uniformPlan("S");
  const dLed = scoreOf(
    blockPlan([
      ["D", 21],
      ["I", 7],
    ]),
    leastPlan,
  );
  const iLed = scoreOf(
    blockPlan([
      ["I", 21],
      ["D", 7],
    ]),
    leastPlan,
  );

  assert.equal(dLed.summary.patternKey, "DI");
  assert.equal(dLed.summary.primary, "D");
  assert.equal(dLed.summary.secondary, "I");
  assert.equal(dLed.result.primaryDimension, "dominance");
  assert.equal(dLed.result.secondaryDimension, "influence");
  assert.equal(dLed.summary.label, `${discPatternProfiles.DI.name} (DI)`);

  assert.equal(iLed.summary.patternKey, "ID");
  assert.equal(iLed.summary.primary, "I");
  assert.equal(iLed.summary.secondary, "D");
  assert.equal(iLed.result.primaryDimension, "influence");
  assert.equal(iLed.result.secondaryDimension, "dominance");
  assert.equal(iLed.summary.label, `${discPatternProfiles.ID.name} (ID)`);

  // Both dimensions are elevated in both directions; only the order changes.
  for (const score of [dLed, iLed]) {
    const segments = totalsOf(score, "segment");
    assert.ok(segments.D >= 5);
    assert.ok(segments.I >= 5);
  }

  assert.notEqual(dLed.result.description, iLed.result.description);
});

test("tolerates the same word as MOST and LEAST, and nets those groups out", () => {
  // Groups 19-27 pick the Dominance term on both sides. None of those nine is an
  // asymmetric D slot, so each adds one to the Most tally and one to the Least
  // tally and contributes nothing to the change score.
  const score = scoreOf(
    blockPlan([
      ["I", 18],
      ["D", 9],
      ["I", 1],
    ]),
    blockPlan([
      ["S", 18],
      ["D", 9],
      ["S", 1],
    ]),
  );

  assert.equal(score.summary.ambiguousGroups, 9);
  assert.equal(totalsOf(score, "mostScore").D, 9);
  assert.equal(totalsOf(score, "leastScore").D, 9);
  assert.equal(totalsOf(score, "changeScore").D, 0);

  // More than seven such groups is reported as reduced confidence.
  assert.match(
    score.interpretation.responseStyle,
    /provisional rather than settled/,
  );
  assert.match(score.interpretation.responseStyle, /9 of the 28 groups/);
  // Every capture path now forbids an equal pair, so the copy has to place the
  // result in the past rather than describe something a respondent could do.
  assert.match(
    score.interpretation.responseStyle,
    /no longer accepts the same word on both sides/,
  );
});

test("explains up to seven cancelled groups without the confidence caution", () => {
  const score = scoreOf(
    blockPlan([
      ["I", 18],
      ["D", 7],
      ["I", 3],
    ]),
    blockPlan([
      ["S", 18],
      ["D", 7],
      ["S", 3],
    ]),
  );

  assert.equal(score.summary.ambiguousGroups, 7);
  assert.equal(totalsOf(score, "changeScore").D, 0);
  assert.match(
    score.interpretation.responseStyle,
    /no longer accepts the same word on both sides/,
  );
  assert.match(
    score.interpretation.responseStyle,
    /those groups simply cancel out/i,
  );
  assert.doesNotMatch(
    score.interpretation.responseStyle,
    /provisional rather than settled/,
  );
});

test("scores an equal pair without throwing, so a stored result still renders", () => {
  // Defence in depth, not a supported input: the grid UI, draft save, submit and
  // XLSX import all refuse an equal pair, so a non-zero ambiguousGroups can only
  // come from a result stored before those gates existed or imported from
  // elsewhere. Scoring has to render it rather than crash a report component.
  const answers = answersFrom(uniformPlan("D"), uniformPlan("S"));
  answers["g09l"] = answers["g09m"];

  const score = scoreDiscAnswers(answers);

  assert.equal(score.summary.ambiguousGroups, 1);
  assert.equal(typeof score.interpretation.responseStyle, "string");
  assert.match(score.interpretation.responseStyle, /1 of the 28 groups/);
  // The 0-group wording must stay reserved for a clean result.
  assert.doesNotMatch(
    score.interpretation.responseStyle,
    /no group cancelled itself out/,
  );
});

test("rejects missing and invalid answers by question number", () => {
  const valid = answersFrom(uniformPlan("D"), uniformPlan("S"));

  const missingLeast = { ...valid };
  delete missingLeast["g09l"];
  assert.throws(
    () => scoreDiscAnswers(missingLeast),
    /Missing or invalid answer for DISC question 18\./,
  );

  const missingMost = { ...valid };
  delete missingMost["g01m"];
  assert.throws(
    () => scoreDiscAnswers(missingMost),
    /Missing or invalid answer for DISC question 1\./,
  );

  assert.throws(
    () => scoreDiscAnswers({}),
    /Missing or invalid answer for DISC question 1\./,
  );

  for (const value of ["E", "a", "", "1", " A", "AB"]) {
    assert.throws(
      () => scoreDiscAnswers({ ...valid, g14m: value }),
      /Missing or invalid answer for DISC question 27\./,
      `value ${JSON.stringify(value)} should be rejected`,
    );
  }
});

test("publishes a complete profile for all 17 pattern keys", () => {
  assert.deepEqual(
    [...Object.keys(discPatternProfiles)].sort(),
    [...patternKeys].sort(),
  );

  const textFields = [
    "name",
    "epithet",
    "description",
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
  const listFields = [
    "generalTraits",
    "strengths",
    "potentialProblemAreas",
    "communicationTips",
    "motivators",
    "developmentTips",
  ] as const;

  const names = new Set<string>();

  for (const key of patternKeys) {
    const profile = discPatternProfiles[key];

    assert.ok(profile, `no profile for pattern ${key}`);
    assert.equal(profile.key, key);

    for (const field of textFields) {
      assert.equal(typeof profile[field], "string", `${key}.${field}`);
      assert.ok(profile[field].trim().length > 0, `${key}.${field} is empty`);
    }

    for (const field of listFields) {
      assert.ok(Array.isArray(profile[field]), `${key}.${field}`);
      assert.ok(profile[field].length > 0, `${key}.${field} is empty`);

      for (const entry of profile[field]) {
        assert.equal(typeof entry, "string");
        assert.ok(entry.trim().length > 0, `${key}.${field} has a blank entry`);
      }
    }

    names.add(profile.name);
  }

  assert.equal(names.size, patternKeys.length, "pattern names must be distinct");
});

test("keeps every authored string free of population comparisons", () => {
  // A forced-choice instrument ranks a respondent's four styles against each
  // other, so nothing it reports supports a claim about how the respondent
  // compares with other people, and no style may be presented as better than
  // another. These strings are concatenated straight into the report, so the ban
  // is enforced on the copy tables themselves.
  const banned: Array<[RegExp, string]> = [
    [/better than (?:anyone|anybody|everyone|most|other)/i, "better-than claim"],
    [/worse than/i, "worse-than claim"],
    [/\b(?:superior|inferior)\b/i, "superiority claim"],
    [/\bthe best\b/i, "superlative claim"],
    [/\bunmatched\b/i, "superlative claim"],
    [/\b(?:nobody|no one) else\b/i, "population comparison"],
    [/more than (?:anyone|anybody|everyone)\b/i, "population comparison"],
    [/\b(?:percentile|above average|below average)\b/i, "norm-group claim"],
  ];

  function scan(label: string, value: unknown) {
    if (typeof value === "string") {
      for (const [pattern, reason] of banned) {
        assert.ok(
          !pattern.test(value),
          `${label} contains a ${reason}: ${JSON.stringify(value)}`,
        );
      }

      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => scan(`${label}[${index}]`, entry));

      return;
    }

    if (value !== null && typeof value === "object") {
      for (const [field, nested] of Object.entries(value)) {
        scan(`${label}.${field}`, nested);
      }
    }
  }

  scan("discPatternProfiles", discPatternProfiles);
  scan("discDimensionProfiles", discDimensionProfiles);
  scan("discGraphMeta", discGraphMeta);
});

test("identifies its own persisted output and not another instrument's", () => {
  const disc = scoreOf(uniformPlan("C"), uniformPlan("D"));
  const persistedDisc = JSON.parse(JSON.stringify(disc)) as ScoreOutput;

  assert.equal(isDiscScoreOutput(persistedDisc), true);

  const bfi = scoreBfiAnswers(
    Object.fromEntries(bfiQuestions.map((question) => [question.id, "3"])),
  );
  const persistedBfi = JSON.parse(JSON.stringify(bfi)) as ScoreOutput;

  assert.equal(isDiscScoreOutput(persistedBfi), false);
});

test("stores the derived pattern's nine narrative fields on the result", () => {
  // The participant's own result screen is reachable from a client entry, so it
  // cannot import this module: profiles.ts sits next to the item bank, and the
  // bank is the answer key. Carrying the narrative on the payload is what lets
  // that screen print the same twelve report fields the dashboard prints, which
  // it could not while the nine were resolved by a lookup at render time.
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

  const seen = new Set<DiscPatternKey>();

  for (const [most, least] of [
    ["D", "S"],
    ["I", "C"],
    ["S", "D"],
    ["C", "I"],
  ] as Array<[DiscDimensionCode, DiscDimensionCode]>) {
    const score = scoreOf(uniformPlan(most), uniformPlan(least));
    const authored = discPatternProfiles[score.summary.patternKey];

    seen.add(score.summary.patternKey);

    assert.deepEqual(
      score.result.patternDetail,
      Object.fromEntries(
        narrativeFields.map((field) => [field, authored[field]]),
      ),
      `${most}/${least} must store exactly the authored narrative for ${score.summary.patternKey}`,
    );

    for (const field of narrativeFields) {
      assert.ok(
        score.result.patternDetail[field].trim().length > 0,
        `${score.summary.patternKey} ${field} must not be empty`,
      );
    }
  }

  assert.ok(seen.size > 1, "the fixtures must reach more than one pattern");
});

test("still recognizes a result stored before the narrative was kept", () => {
  // A DISC record written by an older build has no result.patternDetail. The
  // guard must go on accepting it: rejecting would drop such a record into the
  // dashboard's "version mismatch" branch and stop showing the graphs and the
  // dimension detail it does have. The report reads the field defensively and
  // prints its own notice instead.
  const stored = JSON.parse(
    JSON.stringify(scoreOf(uniformPlan("I"), uniformPlan("S"))),
  ) as ScoreOutput;

  delete (stored.result as { patternDetail?: unknown }).patternDetail;

  assert.equal(isDiscScoreOutput(stored), true);
  assert.equal(stored.result.patternDetail, undefined);
  // Everything the graphs are drawn from is still checked, so a record that
  // passes can always be plotted.
  assert.equal(
    (stored.result.graphs as Array<{ points: unknown[] }>).length,
    3,
  );
});

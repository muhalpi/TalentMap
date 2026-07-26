import type { AnswerMap } from "@/tests/shared/types";

import {
  discDimensionByCode,
  discDimensionOrder,
  discDimensionProfiles,
  discGraphMeta,
  discPatternProfiles,
} from "./profiles";
import { discQuestions } from "./questions";
import { discIntensityFor, discSegmentForIntensity } from "./segments";
import { discTermGroups, discTermPositions } from "./terms";
import type { DiscTerm, DiscTermGroup, DiscTermPosition } from "./terms";
import type {
  DiscBand,
  DiscDimensionCode,
  DiscDimensionScore,
  DiscGraph,
  DiscGraphKey,
  DiscGraphPoint,
  DiscPatternKey,
  DiscScoreOutput,
} from "./types";

const validAnswers = new Set<string>(discTermPositions);

/**
 * The order the report prints a segment tuple in, e.g. "6-4-2-4".
 *
 * Pinned here rather than taken from `discDimensionOrder` so that the printed
 * label stays D-I-S-C even if the profile display order is ever changed: a
 * reader of "6-4-2-4" has no way to tell which order it is in.
 */
const discSegmentLabelOrder: DiscDimensionCode[] = ["D", "I", "S", "C"];

function isDiscTermPosition(
  value: string | undefined,
): value is DiscTermPosition {
  return value !== undefined && validAnswers.has(value);
}

function emptyCodeTotals(): Record<DiscDimensionCode, number> {
  return { D: 0, I: 0, S: 0, C: 0 };
}

function scoreBand(segment: number): DiscBand {
  if (segment >= 5) {
    return "high";
  }

  if (segment === 4) {
    return "moderate";
  }

  return "low";
}

function termAt(group: DiscTermGroup, position: DiscTermPosition): DiscTerm {
  const term = group.terms.find(
    (candidate) => candidate.position === position,
  );

  if (!term) {
    throw new Error(
      `DISC group ${group.group} has no term at position ${position}.`,
    );
  }

  return term;
}

/**
 * Resolves the pattern key from the two most elevated dimensions.
 *
 * The two codes are always different, so the paired key always exists in
 * discPatternProfiles; the membership test is there so that an unexpected key
 * degrades to the single-dimension pattern rather than producing an undefined
 * profile lookup further down.
 */
function discPatternKeyFor(
  primary: DiscDimensionCode | null,
  secondary: DiscDimensionCode | null,
): DiscPatternKey {
  if (primary === null) {
    return "balanced";
  }

  if (secondary === null) {
    return primary;
  }

  const paired = `${primary}${secondary}`;

  return paired in discPatternProfiles ? (paired as DiscPatternKey) : primary;
}

interface DiscPatternCandidate {
  code: DiscDimensionCode;
  segment: number;
  /**
   * Breaks a tie between two dimensions sitting in the same segment. Higher must
   * mean more of that dimension on the graph being derived.
   */
  tieBreak: number;
}

interface DiscPatternDerivation {
  primary: DiscDimensionCode | null;
  secondary: DiscDimensionCode | null;
  patternKey: DiscPatternKey;
}

/**
 * The single pattern derivation, applied to one graph's segment tuple.
 *
 * Elevated means segment 5 or above, which is the same threshold as the "high"
 * band. Nothing elevated gives the balanced pattern; one elevated dimension
 * gives a single-code pattern; two or more give the top two codes in order.
 *
 * Ranking is by segment, then by the caller's tiebreak, then by the order the
 * candidates were supplied in - which callers supply as the instrument's fixed
 * D, I, S, C order, so a genuine three-way tie resolves the same way every time
 * rather than depending on sort stability.
 *
 * All three graphs and the top-level summary run through here, so a graph's
 * pattern and the summary's pattern can never be derived by two different rules.
 * What each graph is NOT is a DiSC Classic "classical pattern": that naming comes
 * from a licensed pattern table this codebase does not hold, so the derived
 * pattern is TalentMap's own and must be presented as such.
 */
function derivePattern(
  candidates: DiscPatternCandidate[],
): DiscPatternDerivation {
  const supplied = candidates.map((candidate) => candidate.code);
  const ranked = [...candidates].sort((left, right) => {
    if (right.segment !== left.segment) {
      return right.segment - left.segment;
    }

    if (right.tieBreak !== left.tieBreak) {
      return right.tieBreak - left.tieBreak;
    }

    return supplied.indexOf(left.code) - supplied.indexOf(right.code);
  });

  const elevated = ranked.filter((candidate) => candidate.segment >= 5);
  const primary = elevated.length > 0 ? elevated[0].code : null;
  const secondary = elevated.length > 1 ? elevated[1].code : null;

  return { primary, secondary, patternKey: discPatternKeyFor(primary, secondary) };
}

/**
 * How each of the three graphs reads a dimension score.
 *
 * `value` is the raw quantity the graph plots, `intensity` is the height it plots
 * it at, and `tieBreak` is the quantity that has to rise with the dimension for
 * `derivePattern` to order a tie correctly. The three differ per graph and the
 * differences are deliberate - see the comment on each entry.
 */
const discGraphSpecs: Array<{
  key: DiscGraphKey;
  value: (profile: DiscDimensionScore) => number;
  intensity: (profile: DiscDimensionScore) => number;
  tieBreak: (profile: DiscDimensionScore) => number;
}> = [
  {
    key: "public",
    value: (profile) => profile.mostScore,
    intensity: (profile) => profile.publicIntensity,
    // Ordinary direction: more MOST picks means more of the dimension.
    tieBreak: (profile) => profile.mostScore,
  },
  {
    key: "private",
    value: (profile) => profile.leastScore,
    intensity: (profile) => profile.privateIntensity,
    // The private conversion table is inverted, so the raw LEAST tally runs the
    // wrong way as a tiebreak - a higher tally means LESS of the dimension. Its
    // intensity is the quantity that rises with the dimension, so tie-break on
    // that instead.
    tieBreak: (profile) => profile.privateIntensity,
  },
  {
    key: "perceived",
    value: (profile) => profile.changeScore,
    intensity: (profile) => profile.intensity,
    // The raw change score rather than the intensity, because this graph's
    // derivation is also the summary's, and the summary has always broken a
    // segment tie on the change score. Switching it to the intensity would
    // silently rescore stored profiles, so it stays as it is.
    tieBreak: (profile) => profile.changeScore,
  },
];

function discGraphFor(
  spec: (typeof discGraphSpecs)[number],
  dimensionProfiles: DiscDimensionScore[],
): DiscGraph {
  const points: DiscGraphPoint[] = dimensionProfiles.map((profile) => {
    const intensity = spec.intensity(profile);

    return {
      key: profile.key,
      code: profile.code,
      value: spec.value(profile),
      intensity,
      segment: discSegmentForIntensity(intensity),
    };
  });

  const segments = emptyCodeTotals();
  for (const point of points) {
    segments[point.code] = point.segment;
  }

  const derived = derivePattern(
    dimensionProfiles.map((profile, index) => ({
      code: profile.code,
      segment: points[index].segment,
      tieBreak: spec.tieBreak(profile),
    })),
  );

  return {
    key: spec.key,
    label: discGraphMeta[spec.key].label,
    caption: discGraphMeta[spec.key].caption,
    points,
    segments,
    segmentLabel: discSegmentLabelOrder
      .map((code) => segments[code])
      .join("-"),
    patternKey: derived.patternKey,
    patternName: discPatternProfiles[derived.patternKey].name,
  };
}

/**
 * How the respondent used the forced-choice format, in words.
 *
 * Every path that can capture a DISC response now forbids the same word on both
 * sides of a group: the Most/Least grid disables the conflicting cell so the
 * state cannot be produced, draft save and submit reject an equal pair, and XLSX
 * result import reports one as a per-cell error. `ambiguousGroups` is therefore
 * expected to be 0 for any newly captured result, and a non-zero count means the
 * result is historical - stored before those gates existed - or came in through
 * another source. The copy says so rather than implying a respondent could still
 * do this today, and the caution above seven groups is kept for exactly that
 * historical and imported data.
 *
 * The zero case says that no group cancelled itself out, and stops there. It must
 * not claim that all 28 groups fed the tallies: 13 of the 112 adjectives are keyed
 * to score on one side only, so a group whose chosen word carries no key for that
 * side contributes nothing even in a perfectly clean response. That asymmetry is
 * source norming, and `interpretation.methodology` says as much in the same
 * object.
 */
function responseStyleFor(ambiguousGroups: number): string {
  if (ambiguousGroups === 0) {
    return "In every group you picked a different word as MOST and as LEAST like you, so no group cancelled itself out. Some adjectives are keyed to score on one side only, which is why the tallies are not expected to add up to 28.";
  }

  const provenance =
    "The questionnaire no longer accepts the same word on both sides, so this result was recorded before that rule was in place or was imported from another source.";

  if (ambiguousGroups > 7) {
    return `In ${ambiguousGroups} of the 28 groups the same word is recorded as both MOST and LEAST like you. ${provenance} Those groups cancel out and add nothing to the tallies, so with this many of them the pattern above should be read as provisional rather than settled. Treat it as a starting point for conversation, and consider working through the questionnaire again with a distinct choice on each side.`;
  }

  return `In ${ambiguousGroups} of the 28 groups the same word is recorded as both MOST and LEAST like you. ${provenance} Those groups simply cancel out, and the remaining groups carry the result.`;
}

/**
 * The one-line label carried in `summary.label`.
 *
 * A pattern derived from a response set with cancelled groups is not as well
 * supported as one derived from a clean set, and in the limit - all 28 groups
 * cancelled - every change score is zero and the pattern carries no information
 * about the respondent at all. The label is the only thing several surfaces show
 * (the results table, the participant history table, the XLSX export), none of
 * which have `ambiguousGroups` to hand, so the qualifier has to travel with the
 * label rather than being left to the report body.
 *
 * The clean case is returned byte-for-byte as it always was. That is deliberate
 * and load-bearing: `resultLabel()` in dashboard-service.ts groups results by
 * this exact string to build the analytics distribution chart, so changing the
 * label for a clean result would split one bucket into two.
 */
function summaryLabelFor(
  patternName: string,
  patternKey: DiscPatternKey,
  ambiguousGroups: number,
): string {
  const label = `${patternName} (${patternKey})`;

  if (ambiguousGroups === 0) {
    return label;
  }

  return `${label} - provisional (${ambiguousGroups}/28 groups cancelled)`;
}

/**
 * Scores a complete set of 56 DISC answers.
 *
 * Throws only for a missing or out-of-range answer, and names the question
 * number when it does. It deliberately does NOT throw when a group carries the
 * same word as both MOST and LEAST: the grid UI, draft save, submit, and result
 * import all refuse that pair, so it cannot be newly captured, but a result
 * stored before those gates existed still has to render instead of crashing a
 * report component. Such a group nets to zero and is counted in
 * `summary.ambiguousGroups`, which is expected to be 0 for anything captured now.
 */
export function scoreDiscAnswers(answers: AnswerMap): DiscScoreOutput {
  const groupByNumber: Record<number, DiscTermGroup> = {};
  for (const group of discTermGroups) {
    groupByNumber[group.group] = group;
  }

  // One pass over the 56 questions: validate, then resolve each answer to the
  // adjective it selected. Iterating discQuestions keeps the reported question
  // number in ascending order, so the first problem a respondent has is the one
  // named in the error.
  const mostTerms: Record<number, DiscTerm> = {};
  const leastTerms: Record<number, DiscTerm> = {};

  for (const question of discQuestions) {
    const answer = answers[question.id];

    if (!isDiscTermPosition(answer)) {
      throw new Error(
        `Missing or invalid answer for DISC question ${question.no}.`,
      );
    }

    const term = termAt(groupByNumber[question.group], answer);

    if (question.kind === "most") {
      mostTerms[question.group] = term;
    } else {
      leastTerms[question.group] = term;
    }
  }

  // Tally from each selected adjective's own keys. Thirteen of the 112 terms
  // score on only one side, so a null key contributes nothing and the tallies
  // are not expected to sum to 28 or to net to zero.
  const mostScore = emptyCodeTotals();
  const leastScore = emptyCodeTotals();
  let ambiguousGroups = 0;

  for (const group of discTermGroups) {
    const mostTerm = mostTerms[group.group];
    const leastTerm = leastTerms[group.group];

    if (mostTerm.mostKey) {
      mostScore[mostTerm.mostKey] += 1;
    }

    if (leastTerm.leastKey) {
      leastScore[leastTerm.leastKey] += 1;
    }

    // An equal pair is refused by the grid UI, by draft save, by submit, and by
    // result import, so this only ever counts up for a result captured before
    // those gates existed or brought in from another source. Counting it instead
    // of throwing is deliberate defence in depth: such a result still has to
    // render in a report component, and the group simply nets to zero.
    if (mostTerm.position === leastTerm.position) {
      ambiguousGroups += 1;
    }
  }

  const dimensionProfiles: DiscDimensionScore[] = discDimensionOrder.map(
    (key) => {
      const definition = discDimensionProfiles[key];
      const code = definition.code;
      const most = mostScore[code];
      const least = leastScore[code];
      const changeScore = most - least;

      // The instrument norms the raw score to an intensity of 1-28 on a table of
      // its own per graph and dimension; the segment is that intensity in bands
      // of four. Deriving both from one intensity per graph is what keeps a
      // point's plotted height and its segment from ever disagreeing.
      const publicIntensity = discIntensityFor("public", code, most);
      const privateIntensity = discIntensityFor("private", code, least);
      const intensity = discIntensityFor("perceived", code, changeScore);
      const segment = discSegmentForIntensity(intensity);
      const band = scoreBand(segment);

      return {
        key,
        code,
        label: definition.label,
        mostScore: most,
        leastScore: least,
        changeScore,
        publicIntensity,
        privateIntensity,
        intensity,
        publicSegment: discSegmentForIntensity(publicIntensity),
        privateSegment: discSegmentForIntensity(privateIntensity),
        segment,
        band,
        // The segment, not the raw change score, is rescaled: the raw ranges
        // are asymmetric and differ per dimension, so they are not comparable.
        scorePercent: Math.round(((segment - 1) / 6) * 100),
        ...definition.bands[band],
      };
    },
  );

  // Each graph carries its own segment tuple and its own derived pattern, so the
  // report can name what the public and private graphs say as well as what the
  // perceived graph says.
  const graphs: DiscGraph[] = discGraphSpecs.map((spec) =>
    discGraphFor(spec, dimensionProfiles),
  );

  const perceivedGraph = graphs.find((graph) => graph.key === "perceived");

  if (perceivedGraph === undefined) {
    throw new Error("DISC scoring did not build the perceived graph.");
  }

  // The summary's pattern is the perceived graph's, so it goes through the same
  // derivation with the same inputs - the perceived segment and the raw change
  // score as the tiebreak - and therefore always equals perceivedGraph.patternKey.
  const perceivedPattern = derivePattern(
    dimensionProfiles.map((profile) => ({
      code: profile.code,
      segment: profile.segment,
      tieBreak: profile.changeScore,
    })),
  );
  const primary = perceivedPattern.primary;
  const secondary = perceivedPattern.secondary;
  const patternKey = perceivedPattern.patternKey;
  const patternProfile = discPatternProfiles[patternKey];

  const profileByCode = {} as Record<DiscDimensionCode, DiscDimensionScore>;
  for (const profile of dimensionProfiles) {
    profileByCode[profile.code] = profile;
  }

  const leadProfile = primary === null ? null : profileByCode[primary];
  const supportProfile = secondary === null ? null : profileByCode[secondary];
  const segments = perceivedGraph.segments;

  const workplaceSummary =
    leadProfile === null
      ? `No single dimension stands out in your perceived self, so your behavior at work may shift more with role expectations and context than with one settled preference. ${patternProfile.organizationValue}`
      : `${leadProfile.label} leads your perceived self${
          supportProfile === null
            ? ""
            : `, supported by ${supportProfile.label}`
        }. ${patternProfile.organizationValue} ${patternProfile.influencesOthersBy}`;

  return {
    summary: {
      model: "DISC",
      label: summaryLabelFor(patternProfile.name, patternKey, ambiguousGroups),
      patternKey,
      scoringMethod:
        "Most and Least tallies converted to an intensity of 1–28 on the instrument's own tables, then to segments 1–7; not a population percentile",
      primary,
      secondary,
      segments,
      ambiguousGroups,
      dimensions: dimensionProfiles.map(
        ({
          key,
          code,
          label,
          mostScore: most,
          leastScore: least,
          changeScore,
          publicIntensity,
          privateIntensity,
          intensity,
          publicSegment,
          privateSegment,
          segment,
          band,
          scorePercent,
        }) => ({
          key,
          code,
          label,
          mostScore: most,
          leastScore: least,
          changeScore,
          publicIntensity,
          privateIntensity,
          intensity,
          publicSegment,
          privateSegment,
          segment,
          band,
          scorePercent,
        }),
      ),
    },
    result: {
      name: patternProfile.name,
      epithet: patternProfile.epithet,
      description: patternProfile.description,
      patternKey,
      // The nine authored fields the report prints between Pattern and
      // Description, copied onto the payload rather than looked up at render
      // time. The participant's result screen is reachable from a client entry
      // and so cannot import this module - a value import of `profiles.ts` would
      // pull the adjective keying, which is the answer key, into the browser
      // bundle. Storing the narrative is what lets that screen print the same
      // twelve rows the dashboard prints, from the payload it already holds.
      patternDetail: {
        emotionalTone: patternProfile.emotionalTone,
        motivation: patternProfile.motivation,
        judgesOthersBy: patternProfile.judgesOthersBy,
        influencesOthersBy: patternProfile.influencesOthersBy,
        organizationValue: patternProfile.organizationValue,
        overuses: patternProfile.overuses,
        underPressure: patternProfile.underPressure,
        fears: patternProfile.fears,
        effectiveness: patternProfile.effectiveness,
      },
      primaryDimension: primary === null ? null : discDimensionByCode[primary],
      secondaryDimension:
        secondary === null ? null : discDimensionByCode[secondary],
      generalTraits: [...patternProfile.generalTraits],
      strengths: [...patternProfile.strengths],
      potentialProblemAreas: [...patternProfile.potentialProblemAreas],
      dimensionProfiles,
      graphs,
    },
    interpretation: {
      overview:
        "Read the three graphs together rather than any single score. DISC describes behavior you tend to prefer, not ability or potential, and no style is better than another: each one carries real strengths alongside its own blind spots. Your pattern is taken from the perceived self graph, so start there, then use the public and private graphs to see how much you may be adapting. Each dimension has its own conversion table, so more than one dimension can read high at once, and the same raw score can sit in a different band on a different dimension; compare the segments rather than the raw numbers.",
      workplaceSummary,
      communicationTips: [...patternProfile.communicationTips],
      motivators: [...patternProfile.motivators],
      stressBehaviors: `${patternProfile.underPressure} ${patternProfile.overuses}`,
      developmentTips: [...patternProfile.developmentTips],
      responseStyle: responseStyleFor(ambiguousGroups),
      methodology:
        "You worked through 28 forced-choice groups of four adjectives, picking one word as MOST like you and a different word as LEAST like you in each group. The Most picks build the public self graph, the Least picks build the private self graph, and the difference between them builds the perceived self graph. Some adjectives are keyed to score on only one side, so the tallies are not expected to sum to a fixed total. Each raw score is then converted to an intensity from 1 to 28 through the instrument's own conversion table for that dimension on that graph, and the intensity is what each graph plots as a height. The segment from 1 to 7 is that intensity in bands of four: intensity 1 to 4 is segment 1, 5 to 8 is segment 2, and so on up to 25 to 28 for segment 7. That is why two dimensions can share a segment and still sit at different heights on a graph. The conversion tables differ by dimension and by graph, and the private self table runs in reverse, so few LEAST picks on a dimension give it a high intensity. Those tables come from the instrument's own reference sample, which is why their boundaries are not symmetric about zero. The 0–100 figure shown for each dimension is a rescale of the segment. It is not a percentile and should not be read as a rank against other people: the comparison this instrument makes is between your own four dimensions.",
      disclaimer:
        "Use this profile for reflection, coaching, and development. It is not a clinical assessment and should not be the sole basis for hiring, promotion, or other high-stakes decisions.",
    },
  };
}

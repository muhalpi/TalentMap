import type { ScoreOutput } from "@/tests/shared/types";

export type DiscDimensionKey =
  | "dominance"
  | "influence"
  | "steadiness"
  | "conscientiousness";

export type DiscDimensionCode = "D" | "I" | "S" | "C";

export type DiscBand = "low" | "moderate" | "high";

/**
 * The three classic DISC graphs. "public" is built from the Most tallies,
 * "private" from the Least tallies, and "perceived" from the change scores.
 */
export type DiscGraphKey = "public" | "private" | "perceived";

export type DiscPatternKey =
  | "D"
  | "I"
  | "S"
  | "C"
  | "DI"
  | "DS"
  | "DC"
  | "ID"
  | "IS"
  | "IC"
  | "SD"
  | "SI"
  | "SC"
  | "CD"
  | "CI"
  | "CS"
  | "balanced";

export interface DiscDimensionScore {
  key: DiscDimensionKey;
  code: DiscDimensionCode;
  label: string;
  mostScore: number;
  leastScore: number;
  changeScore: number;
  /** 1-28 on the public (MOST) conversion table. */
  publicIntensity: number;
  /**
   * 1-28 on the private (LEAST) conversion table, which is inverted: a low
   * Least tally converts to a HIGH intensity.
   */
  privateIntensity: number;
  /** 1-28 on the perceived (change score) conversion table. */
  intensity: number;
  publicSegment: number;
  privateSegment: number;
  segment: number;
  band: DiscBand;
  scorePercent: number;
  description: string;
  workStyle: string;
  strength: string;
  watchOut: string;
  developmentTip: string;
}

export interface DiscGraphPoint {
  key: DiscDimensionKey;
  code: DiscDimensionCode;
  /** The raw tally or change score this graph plots. */
  value: number;
  /**
   * 1-28. The plotted height of the point, and the quantity the instrument
   * actually norms. Two dimensions in the same segment can sit at different
   * intensities, so a graph cannot be drawn from the segment alone.
   */
  intensity: number;
  /** Derived from the intensity: `ceil(intensity / 4)`, so 1-7. */
  segment: number;
}

export interface DiscGraph {
  key: DiscGraphKey;
  label: string;
  caption: string;
  points: DiscGraphPoint[];
  /** This graph's own segment per dimension, keyed by code. */
  segments: Record<DiscDimensionCode, number>;
  /** This graph's segments in D-I-S-C order, joined by "-", e.g. "6-4-2-4". */
  segmentLabel: string;
  /**
   * TalentMap's own pattern derivation applied to THIS graph's segment tuple.
   *
   * This is not the DiSC Classic "classical pattern" name: that assignment comes
   * from a licensed pattern table this codebase does not have, so it is not
   * reproduced or guessed at. Any surface showing `patternName` must present it
   * as TalentMap's derivation rather than as the classical pattern.
   */
  patternKey: DiscPatternKey;
  patternName: string;
}

export interface DiscPatternProfile {
  key: DiscPatternKey;
  name: string;
  epithet: string;
  description: string;
  emotionalTone: string;
  motivation: string;
  judgesOthersBy: string;
  influencesOthersBy: string;
  organizationValue: string;
  overuses: string;
  underPressure: string;
  fears: string;
  effectiveness: string;
  generalTraits: string[];
  strengths: string[];
  potentialProblemAreas: string[];
  communicationTips: string[];
  motivators: string[];
  developmentTips: string[];
}

/**
 * The nine authored narrative fields the printed report prints between Pattern
 * and Description: Emotions, Goal, Judges others by, Influences others by, Value
 * to the organization, Overuses, Under pressure, Fears, and Would increase
 * effectiveness through.
 *
 * They are authored per pattern in `profiles.ts`, and scoring copies the set for
 * the derived pattern onto `result.patternDetail`. That copy is what makes the
 * participant's own result screen able to show them: the participant surface is
 * reachable from a client entry, so it cannot import `profiles.ts` without
 * shipping the adjective keying to the browser, but it can read a field off the
 * payload it is already given.
 */
export type DiscPatternNarrative = Pick<
  DiscPatternProfile,
  | "emotionalTone"
  | "motivation"
  | "judgesOthersBy"
  | "influencesOthersBy"
  | "organizationValue"
  | "overuses"
  | "underPressure"
  | "fears"
  | "effectiveness"
>;

export interface DiscScoreOutput extends ScoreOutput {
  summary: {
    model: "DISC";
    label: string;
    patternKey: DiscPatternKey;
    scoringMethod: string;
    primary: DiscDimensionCode | null;
    secondary: DiscDimensionCode | null;
    segments: Record<DiscDimensionCode, number>;
    ambiguousGroups: number;
    dimensions: Array<
      Pick<
        DiscDimensionScore,
        | "key"
        | "code"
        | "label"
        | "mostScore"
        | "leastScore"
        | "changeScore"
        | "publicIntensity"
        | "privateIntensity"
        | "intensity"
        | "publicSegment"
        | "privateSegment"
        | "segment"
        | "band"
        | "scorePercent"
      >
    >;
  };
  result: {
    name: string;
    epithet: string;
    description: string;
    patternKey: DiscPatternKey;
    /**
     * The nine authored narrative fields for `patternKey`, stored with the result
     * so every surface can print the full report field list without importing the
     * instrument. See `DiscPatternNarrative`.
     */
    patternDetail: DiscPatternNarrative;
    primaryDimension: DiscDimensionKey | null;
    secondaryDimension: DiscDimensionKey | null;
    generalTraits: string[];
    strengths: string[];
    potentialProblemAreas: string[];
    dimensionProfiles: DiscDimensionScore[];
    graphs: DiscGraph[];
  };
  interpretation: {
    overview: string;
    workplaceSummary: string;
    communicationTips: string[];
    motivators: string[];
    stressBehaviors: string;
    developmentTips: string[];
    responseStyle: string;
    methodology: string;
    disclaimer: string;
  };
}

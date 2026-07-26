import type { ScoreOutput } from "@/tests/shared/types";

export type BfiTraitKey =
  | "extraversion"
  | "agreeableness"
  | "conscientiousness"
  | "emotionalStability"
  | "opennessIntellect";

export type BfiTraitBand = "lower" | "moderate" | "higher";

export interface BfiTraitScore {
  key: BfiTraitKey;
  code: "E" | "A" | "C" | "ES" | "O";
  label: string;
  rawScore: number;
  maxRawScore: 50;
  average: number;
  scorePercent: number;
  band: BfiTraitBand;
  description: string;
  workStyle: string;
  strength: string;
  watchOut: string;
  developmentTip: string;
}

export interface BfiScoreOutput extends ScoreOutput {
  summary: {
    model: "IPIP-BFM-50";
    label: string;
    scoringMethod: string;
    dimensions: Array<
      Pick<
        BfiTraitScore,
        | "key"
        | "code"
        | "label"
        | "rawScore"
        | "maxRawScore"
        | "average"
        | "scorePercent"
        | "band"
      >
    >;
  };
  result: {
    name: string;
    epithet: string;
    description: string;
    highestTrait: BfiTraitKey;
    lowestTrait: BfiTraitKey;
    generalTraits: string[];
    strengths: string[];
    potentialProblemAreas: string[];
    traitProfiles: BfiTraitScore[];
  };
  interpretation: {
    overview: string;
    workplaceSummary: string;
    developmentTips: string[];
    methodology: string;
    disclaimer: string;
  };
}

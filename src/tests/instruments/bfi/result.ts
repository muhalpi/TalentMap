import type { ScoreOutput } from "@/tests/shared/types";

import type { BfiScoreOutput, BfiTraitScore } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTraitScore(value: unknown): value is BfiTraitScore {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.code === "string" &&
    typeof value.label === "string" &&
    typeof value.rawScore === "number" &&
    value.maxRawScore === 50 &&
    typeof value.average === "number" &&
    typeof value.scorePercent === "number" &&
    (value.band === "lower" ||
      value.band === "moderate" ||
      value.band === "higher") &&
    typeof value.description === "string" &&
    typeof value.workStyle === "string" &&
    typeof value.strength === "string" &&
    typeof value.watchOut === "string" &&
    typeof value.developmentTip === "string"
  );
}

export function isBfiScoreOutput(score: ScoreOutput): score is BfiScoreOutput {
  const traits = score.result.traitProfiles;

  return (
    score.summary.model === "IPIP-BFM-50" &&
    typeof score.summary.label === "string" &&
    Array.isArray(score.summary.dimensions) &&
    typeof score.result.name === "string" &&
    typeof score.result.epithet === "string" &&
    typeof score.result.description === "string" &&
    Array.isArray(traits) &&
    traits.length === 5 &&
    traits.every(isTraitScore) &&
    isRecord(score.interpretation) &&
    typeof score.interpretation.overview === "string" &&
    typeof score.interpretation.workplaceSummary === "string" &&
    Array.isArray(score.interpretation.developmentTips) &&
    typeof score.interpretation.methodology === "string" &&
    typeof score.interpretation.disclaimer === "string"
  );
}

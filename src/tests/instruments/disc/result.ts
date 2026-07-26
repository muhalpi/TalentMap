import type { ScoreOutput } from "@/tests/shared/types";

import type {
  DiscDimensionScore,
  DiscGraph,
  DiscGraphPoint,
  DiscScoreOutput,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDimensionScore(value: unknown): value is DiscDimensionScore {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.code === "string" &&
    typeof value.label === "string" &&
    typeof value.mostScore === "number" &&
    typeof value.leastScore === "number" &&
    typeof value.changeScore === "number" &&
    typeof value.publicSegment === "number" &&
    typeof value.privateSegment === "number" &&
    typeof value.segment === "number" &&
    (value.band === "low" ||
      value.band === "moderate" ||
      value.band === "high") &&
    typeof value.scorePercent === "number" &&
    typeof value.description === "string" &&
    typeof value.workStyle === "string" &&
    typeof value.strength === "string" &&
    typeof value.watchOut === "string" &&
    typeof value.developmentTip === "string"
  );
}

function isGraphPoint(value: unknown): value is DiscGraphPoint {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    typeof value.code === "string" &&
    typeof value.value === "number" &&
    typeof value.segment === "number"
  );
}

function isGraph(value: unknown): value is DiscGraph {
  return (
    isRecord(value) &&
    (value.key === "public" ||
      value.key === "private" ||
      value.key === "perceived") &&
    typeof value.label === "string" &&
    typeof value.caption === "string" &&
    Array.isArray(value.points) &&
    value.points.length === 4 &&
    value.points.every(isGraphPoint)
  );
}

export function isDiscScoreOutput(
  score: ScoreOutput,
): score is DiscScoreOutput {
  const dimensionProfiles = score.result.dimensionProfiles;
  const graphs = score.result.graphs;
  const interpretation = score.interpretation;

  return (
    score.summary.model === "DISC" &&
    typeof score.summary.label === "string" &&
    typeof score.summary.patternKey === "string" &&
    typeof score.summary.scoringMethod === "string" &&
    typeof score.summary.ambiguousGroups === "number" &&
    isRecord(score.summary.segments) &&
    Array.isArray(score.summary.dimensions) &&
    typeof score.result.name === "string" &&
    typeof score.result.epithet === "string" &&
    typeof score.result.description === "string" &&
    Array.isArray(score.result.generalTraits) &&
    Array.isArray(score.result.strengths) &&
    Array.isArray(score.result.potentialProblemAreas) &&
    Array.isArray(dimensionProfiles) &&
    dimensionProfiles.length === 4 &&
    dimensionProfiles.every(isDimensionScore) &&
    Array.isArray(graphs) &&
    graphs.length === 3 &&
    graphs.every(isGraph) &&
    isRecord(interpretation) &&
    typeof interpretation.overview === "string" &&
    typeof interpretation.workplaceSummary === "string" &&
    Array.isArray(interpretation.communicationTips) &&
    Array.isArray(interpretation.motivators) &&
    typeof interpretation.stressBehaviors === "string" &&
    Array.isArray(interpretation.developmentTips) &&
    typeof interpretation.responseStyle === "string" &&
    typeof interpretation.methodology === "string" &&
    typeof interpretation.disclaimer === "string"
  );
}

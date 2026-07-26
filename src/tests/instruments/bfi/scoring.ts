import type { AnswerMap } from "@/tests/shared/types";

import { bfiTraitOrder, bfiTraitProfiles } from "./profiles";
import { bfiQuestions } from "./questions";
import type {
  BfiScoreOutput,
  BfiTraitBand,
  BfiTraitKey,
  BfiTraitScore,
} from "./types";

const validAnswers = new Set(["1", "2", "3", "4", "5"]);

function roundTo(value: number, places: number) {
  const multiplier = 10 ** places;
  return Math.round(value * multiplier) / multiplier;
}

function scoreBand(average: number): BfiTraitBand {
  if (average < 2.34) {
    return "lower";
  }

  if (average > 3.66) {
    return "higher";
  }

  return "moderate";
}

function emptyTraitTotals(): Record<BfiTraitKey, number> {
  return {
    extraversion: 0,
    agreeableness: 0,
    conscientiousness: 0,
    emotionalStability: 0,
    opennessIntellect: 0,
  };
}

function traitScore(key: BfiTraitKey, rawScore: number): BfiTraitScore {
  const average = roundTo(rawScore / 10, 2);
  const scorePercent = Math.round(((average - 1) / 4) * 100);
  const band = scoreBand(average);
  const definition = bfiTraitProfiles[key];
  const bandProfile = definition.bands[band];

  return {
    key,
    code: definition.code,
    label: definition.label,
    rawScore,
    maxRawScore: 50,
    average,
    scorePercent,
    band,
    ...bandProfile,
  };
}

function unique(items: string[]) {
  return [...new Set(items)];
}

export function scoreBfiAnswers(answers: AnswerMap): BfiScoreOutput {
  const totals = emptyTraitTotals();

  for (const question of bfiQuestions) {
    const answer = answers[question.id];

    if (!answer || !validAnswers.has(answer)) {
      throw new Error(
        `Missing or invalid answer for Big Five question ${question.no}.`,
      );
    }

    const numericAnswer = Number(answer);
    totals[question.trait] += question.reverse
      ? 6 - numericAnswer
      : numericAnswer;
  }

  const traitProfiles = bfiTraitOrder.map((key) =>
    traitScore(key, totals[key]),
  );
  const ranked = [...traitProfiles].sort(
    (left, right) => right.average - left.average,
  );
  const highest = ranked[0];
  const lowest = ranked[ranked.length - 1];
  const balanced = highest.average - lowest.average < 0.2;
  const label = balanced
    ? "Balanced trait profile"
    : `${highest.label} stands out`;
  const distinctivenessOrder = [...traitProfiles].sort(
    (left, right) =>
      Math.abs(right.average - 3) - Math.abs(left.average - 3),
  );

  return {
    summary: {
      model: "IPIP-BFM-50",
      label,
      scoringMethod: "Position on the 1–5 response scale; not a population percentile",
      dimensions: traitProfiles.map(
        ({
          key,
          code,
          label: traitLabel,
          rawScore,
          maxRawScore,
          average,
          scorePercent,
          band,
        }) => ({
          key,
          code,
          label: traitLabel,
          rawScore,
          maxRawScore,
          average,
          scorePercent,
          band,
        }),
      ),
    },
    result: {
      name: "Big Five work style profile",
      epithet: balanced
        ? "Your five trait scores are expressed at a similar level."
        : `${highest.label} is the most strongly expressed trait in this response pattern.`,
      description:
        "This profile describes five independent personality dimensions. It is a pattern of tendencies rather than a fixed type, and every level can bring useful strengths in the right context.",
      highestTrait: highest.key,
      lowestTrait: lowest.key,
      generalTraits: traitProfiles.map(
        (trait) => `${trait.label}: ${trait.description}`,
      ),
      strengths: unique(
        distinctivenessOrder.map((trait) => trait.strength),
      ),
      potentialProblemAreas: unique(
        distinctivenessOrder.map((trait) => trait.watchOut),
      ),
      traitProfiles,
    },
    interpretation: {
      overview:
        "Read the five scores together. A higher or lower score is not inherently better; it indicates which behaviors may feel more natural and which may require more deliberate effort.",
      workplaceSummary: balanced
        ? "Your responses suggest a relatively even profile, so your behavior may shift more noticeably with role expectations and context than with one strongly expressed trait."
        : `Your clearest pattern is ${highest.label.toLowerCase()}, while ${lowest.label.toLowerCase()} is less strongly expressed. Consider how that contrast supports your current role and where it may create blind spots.`,
      developmentTips: distinctivenessOrder.map(
        (trait) => `${trait.label}: ${trait.developmentTip}`,
      ),
      methodology:
        "Each trait is scored from 10 IPIP-derived items. Negatively keyed items are reverse-scored, then item scores are averaged. The 0–100 display rescales the possible 1–5 range and is not a percentile or comparison with a norm group.",
      disclaimer:
        "Use this profile for reflection, coaching, and development. It is not a clinical assessment and should not be the sole basis for hiring, promotion, or other high-stakes decisions.",
    },
  };
}

import type { AnswerMap, ScoreOutput } from "@/tests/shared/types";

import { personalityTest } from "./questions";
import { personalityClassGroup } from "./result-map";
import type { PersonalityClassGroup } from "./legacy-types";

type MbtiAnswer = "A" | "B";
type MbtiLetter = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";
type MbtiType = PersonalityClassGroup["type"];

interface MbtiCounts {
  E: number;
  I: number;
  S: number;
  N: number;
  T: number;
  F: number;
  J: number;
  P: number;
}

export interface MbtiScoreOutput extends ScoreOutput {
  summary: {
    type: MbtiType;
    counts: MbtiCounts;
    dimensions: {
      code: "EI" | "SN" | "TF" | "JP";
      selected: MbtiLetter;
      left: MbtiLetter;
      right: MbtiLetter;
      leftScore: number;
      rightScore: number;
    }[];
  };
  result: {
    type: MbtiType;
    name: string;
    nameDescription: string;
    epithet: string;
    imagePath: string;
    description: string;
    jungianFunctionalPreference: PersonalityClassGroup["jungianFunctionalPreference"];
    generalTraits: string[];
    strengths: string[];
    potentialProblemAreas: string[];
  };
  interpretation: {
    relationshipStrengths: string[];
    relationshipWeaknesses: string[];
    successDefinition: string;
    gifts: string[];
    livingHappilyTips: string;
    tenRulesToLive: string[];
  };
}

function isMbtiAnswer(value: string | undefined): value is MbtiAnswer {
  return value === "A" || value === "B";
}

function emptyCounts(): MbtiCounts {
  return {
    E: 0,
    I: 0,
    S: 0,
    N: 0,
    T: 0,
    F: 0,
    J: 0,
    P: 0,
  };
}

function increment(counts: MbtiCounts, letter: MbtiLetter) {
  counts[letter] += 1;
}

function getSelectedType(counts: MbtiCounts): MbtiType {
  return `${counts.E >= counts.I ? "E" : "I"}${
    counts.S >= counts.N ? "S" : "N"
  }${counts.T >= counts.F ? "T" : "F"}${
    counts.J >= counts.P ? "J" : "P"
  }` as MbtiType;
}

export function scoreMbtiAnswers(answers: AnswerMap): MbtiScoreOutput {
  const counts = emptyCounts();

  for (const question of personalityTest) {
    const answer = answers[String(question.no)];

    if (!isMbtiAnswer(answer)) {
      throw new Error(`Missing or invalid answer for MBTI question ${question.no}.`);
    }

    const selected = question.answerOptions.find(
      (option) => option.type === answer,
    );

    if (!selected) {
      throw new Error(`Answer ${answer} is not valid for MBTI question ${question.no}.`);
    }

    increment(counts, selected.score);
  }

  const type = getSelectedType(counts);
  const profile = personalityClassGroup.find((group) => group.type === type);

  if (!profile) {
    throw new Error(`No MBTI result profile is registered for ${type}.`);
  }

  return {
    summary: {
      type,
      counts,
      dimensions: [
        {
          code: "EI",
          selected: counts.E >= counts.I ? "E" : "I",
          left: "E",
          right: "I",
          leftScore: counts.E,
          rightScore: counts.I,
        },
        {
          code: "SN",
          selected: counts.S >= counts.N ? "S" : "N",
          left: "S",
          right: "N",
          leftScore: counts.S,
          rightScore: counts.N,
        },
        {
          code: "TF",
          selected: counts.T >= counts.F ? "T" : "F",
          left: "T",
          right: "F",
          leftScore: counts.T,
          rightScore: counts.F,
        },
        {
          code: "JP",
          selected: counts.J >= counts.P ? "J" : "P",
          left: "J",
          right: "P",
          leftScore: counts.J,
          rightScore: counts.P,
        },
      ],
    },
    result: {
      type,
      name: profile.name,
      nameDescription: profile.nameDescription,
      epithet: profile.epithet,
      imagePath: `/images/mbti/${type.toLowerCase()}.png`,
      description: profile.description,
      jungianFunctionalPreference: profile.jungianFunctionalPreference,
      generalTraits: profile.generalTraits,
      strengths: profile.strengths,
      potentialProblemAreas: profile.potentialProblemAreas,
    },
    interpretation: {
      relationshipStrengths: profile.relationshipStrengths,
      relationshipWeaknesses: profile.relationshipWeaknesses,
      successDefinition: profile.successDefinition,
      gifts: profile.gifts,
      livingHappilyTips: profile.livingHappilyTips,
      tenRulesToLive: profile.tenRulesToLive,
    },
  };
}

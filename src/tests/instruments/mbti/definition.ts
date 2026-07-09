import type { TestDefinition } from "@/tests/shared/types";

import { personalityTest } from "./questions";
import { scoreMbtiAnswers, type MbtiScoreOutput } from "./scoring";

export const mbtiDefinition: TestDefinition<MbtiScoreOutput> = {
  key: "mbti",
  name: "MBTI Personality Type",
  version: "legacy-1.0.0",
  description:
    "A 70-item forced-choice personality type assessment adapted from the existing MBTI repository.",
  estimatedMinutes: 12,
  implemented: true,
  questions: personalityTest.map((question) => ({
    id: String(question.no),
    no: question.no,
    prompt: question.question.trim(),
    options: question.answerOptions.map((option) => ({
      value: option.type,
      label: option.answer,
    })),
  })),
  score: scoreMbtiAnswers,
};

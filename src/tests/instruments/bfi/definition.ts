import type { TestDefinition } from "@/tests/shared/types";

import { bfiQuestions, bfiResponseOptions } from "./questions";
import { scoreBfiAnswers } from "./scoring";
import type { BfiScoreOutput } from "./types";

export const bfiDefinition: TestDefinition<BfiScoreOutput> = {
  key: "bfi",
  name: "Big Five Work Style Profile",
  version: "ipip-bfm-50-en-tm-1.1.0",
  description:
    "A plain-English adaptation of the public-domain 50-item IPIP assessment of Extraversion, Agreeableness, Conscientiousness, Emotional Stability, and Openness/Intellect.",
  estimatedMinutes: 10,
  implemented: true,
  questions: bfiQuestions.map((question) => ({
    id: question.id,
    no: question.no,
    prompt: question.prompt,
    options: bfiResponseOptions,
  })),
  score: scoreBfiAnswers,
};

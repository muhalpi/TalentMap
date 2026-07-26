import type { TestDefinition } from "@/tests/shared/types";

import { discForcedChoiceGroups, discQuestions } from "./questions";
import { scoreDiscAnswers } from "./scoring";
import type { DiscScoreOutput } from "./types";

export const discDefinition: TestDefinition<DiscScoreOutput> = {
  key: "disc",
  name: "DISC Work Behaviour Profile",
  version: "disc-classic-28-en-tm-1.0.0",
  description:
    "A 28-group forced-choice DISC questionnaire that scores Dominance, Influence, Steadiness, and Conscientiousness across public, private, and perceived graphs.",
  estimatedMinutes: 15,
  implemented: true,
  questions: discQuestions.map((question) => ({
    id: question.id,
    no: question.no,
    prompt: question.prompt,
    options: question.options,
    // The side travels with the item so the participant screen can word its
    // instruction - "MOST like you" against "LEAST like you" - without importing
    // the item bank, which also holds every adjective's D/I/S/C keying and must
    // never reach the participant's browser.
    forcedChoiceSide: question.kind,
  })),
  // Presentation and validation metadata only. The 56 questions above stay the
  // storage contract: answers persist as g01m/g01l .. g28m/g28l with values
  // "A".."D", which is what keeps drafts, submission, scoring, and the XLSX
  // q01..q56 round trip unchanged.
  presentation: "forced-choice-grid",
  forcedChoiceGroups: discForcedChoiceGroups,
  exclusiveWithinGroup: true,
  score: scoreDiscAnswers,
};

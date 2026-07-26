export type TestKey =
  | "mbti"
  | "kts2"
  | "mmpi"
  | "bfi"
  | "sds"
  | "papi"
  | "disc";

export type AnswerMap = Record<string, string>;

export interface PublicTestOption {
  value: string;
  label: string;
}

/**
 * Which side of a forced-choice group a question answers: the option that fits
 * the respondent most, or the one that fits them least.
 */
export type ForcedChoiceSide = "most" | "least";

export interface PublicTestQuestion {
  id: string;
  no: number;
  prompt: string;
  options: PublicTestOption[];
  /**
   * Present only on a forced-choice item, and absent for every single-question
   * instrument, so nothing about those changes.
   *
   * It rides on the public payload because the participant's browser has to word
   * the instruction per side - "the word that is MOST like you" against "LEAST
   * like you" - and reading the side from the instrument's item bank instead
   * would pull that bank, including each option's scoring key, into the client
   * bundle. Presentation metadata only: it never changes which questions exist
   * or how an answer is stored.
   */
  forcedChoiceSide?: ForcedChoiceSide;
}

/**
 * How the participant runner walks an instrument through its items.
 *
 * - `"single-question"` - one `PublicTestQuestion` per screen. This is the
 *   default for every instrument and the only behaviour that existed before
 *   forced-choice presentation was added, so omitting the field on a definition
 *   must keep that instrument's experience byte-for-byte identical.
 * - `"forced-choice-grid"` - one `ForcedChoiceGroup` per screen. Several
 *   questions are answered together on a single screen.
 *
 * Presentation is a UI concern only. It never changes how answers are stored,
 * which question ids exist, or how many questions an instrument defines.
 */
export type TestPresentation = "single-question" | "forced-choice-grid";

/**
 * One screen of a forced-choice instrument: a shared set of options that the
 * participant ranks on two opposed axes at once - the option that fits them
 * most and the option that fits them least.
 *
 * IMPORTANT - this descriptor is derived presentation metadata. It does not
 * replace or reshape anything persisted:
 *
 * - The two sides are ordinary questions from `TestDefinition.questions`.
 *   `mostQuestionId` and `leastQuestionId` are their `PublicTestQuestion.id`
 *   values.
 * - The stored answer map stays a flat `AnswerMap` keyed by those individual
 *   question ids, with values drawn from `options[].value`. A 28-group
 *   instrument still persists 56 entries, still defines 56 questions, and still
 *   round-trips through drafts, submission, scoring, and spreadsheet import and
 *   export unchanged.
 * - `options` is the same option list both sides offer, in display order, so
 *   the grid can render one row per option with a cell in each column.
 */
export interface ForcedChoiceGroup {
  /** 1-based group number, matching the instrument's own group numbering. */
  group: number;
  /** Human-readable position within the instrument, e.g. "Group 9 of 28". */
  label: string;
  /** The options shared by both sides, in display order. */
  options: PublicTestOption[];
  /** Question id for the "most like me" side, e.g. "g09m". */
  mostQuestionId: string;
  /** Question id for the "least like me" side, e.g. "g09l". */
  leastQuestionId: string;
}

export interface ScoreOutput {
  summary: Record<string, unknown>;
  result: Record<string, unknown>;
  interpretation?: Record<string, unknown>;
}

export interface TestDefinition<TScore extends ScoreOutput = ScoreOutput> {
  key: TestKey;
  name: string;
  version: string;
  description: string;
  estimatedMinutes: number;
  implemented: boolean;
  questions: PublicTestQuestion[];
  /**
   * Optional and backward compatible. Absent means `"single-question"`, so
   * instruments that do not declare it keep their existing one-question-per-
   * screen experience with no change.
   */
  presentation?: TestPresentation;
  /**
   * Present only when `presentation` is `"forced-choice-grid"`, and derived
   * from the same item bank as `questions` so the two cannot drift. Every
   * `mostQuestionId` and `leastQuestionId` here is an id that also appears in
   * `questions`; the persisted answer map is still keyed by those ids.
   */
  forcedChoiceGroups?: ForcedChoiceGroup[];
  /**
   * `true` means the two sides of a group must not carry the same answer - an
   * option cannot be both most and least. Enforced by the grid UI structurally,
   * by draft save, by submit, and by result import. Absent or `false` means no
   * such constraint applies.
   */
  exclusiveWithinGroup?: boolean;
  score: (answers: AnswerMap) => TScore;
}

export interface TestCatalogItem {
  key: TestKey;
  name: string;
  version: string;
  description: string;
  estimatedMinutes: number;
  implemented: boolean;
}

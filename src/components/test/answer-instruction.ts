import type { ForcedChoiceSide, PublicTestQuestion } from "@/tests/shared/types";

/**
 * Every sentence a participant reads above their answer controls, in one place so
 * the single-question screen and the forced-choice grid screen cannot word the
 * same idea two ways.
 *
 * Where each export is rendered, so nothing here is kept alive by its own test:
 * - `answerInstruction` - the instruction row of the single-question screen in
 *   `participant-test-runner.tsx`.
 * - `forcedChoiceGroupInstruction` - the instruction row of the grid screen in the
 *   same component.
 * - `forcedChoiceExclusivityRule` - the visible rule line in
 *   `forced-choice-group-table.tsx`, which every radio in both columns points at
 *   with `aria-describedby`.
 * - `forcedChoiceColumnInstruction` - the wording both of the above are built
 *   from, and the reason a side means the same thing in either presentation.
 */

const advanceNote =
  "Your selection will move to the next question automatically.";

const mostColumnInstruction =
  "Pick the one word that is MOST like you - the one that fits you best of the four.";
const leastColumnInstruction =
  "Pick the one word that is LEAST like you - the one that fits you worst of the four.";

/**
 * The exclusivity rule, verbatim, as the participant reads it.
 *
 * A forced-choice group is scored as the difference between the word picked as
 * most like the respondent and the word picked as least like them, so the same
 * word on both sides is a contradiction rather than a preference. The grid
 * renders this sentence as its visible rule line and points every radio at it
 * with `aria-describedby`, so there is exactly one wording of the rule.
 */
export const forcedChoiceExclusivityRule =
  "A word cannot be both Most and Least.";

/**
 * The instruction shown under the question prompt in the participant runner.
 *
 * Most instruments here are best-fit, so "the option that describes you best" is
 * correct for them. A forced-choice item is not: half of a forced-choice
 * instrument's items ask for the word that fits the participant LEAST, and a
 * participant who follows a best-fit instruction there inflates the Least tally
 * for the dimension they actually identify with, which inverts the change scores
 * the entire profile is derived from.
 *
 * The side is read from `question.forcedChoiceSide`, which the instrument's
 * definition puts on the public payload - never from the prompt text, from the
 * question number's parity, or by asking the item bank, because the item bank
 * also holds the scoring keys and this module is imported by a client component.
 *
 * The forced-choice branch deliberately omits the auto-advance promise. A
 * forced-choice group is presented as ONE screen with a Most and a Least column,
 * where two answers are given before the screen changes, so nothing about such an
 * item can claim that one selection moves the participant on.
 *
 * That branch is not decoration. The runner renders the grid only when the
 * instrument asks for it AND publishes at least one group - `isGridMode` in
 * `participant-test-runner.tsx` requires both - so a forced-choice instrument that
 * has not opted into the grid, or whose group list is empty, falls back to this
 * single-question row, and the branch is the only thing standing between that
 * fallback and a best-fit instruction that would invert the item's contribution.
 */
export function answerInstruction(question: PublicTestQuestion): string {
  return question.forcedChoiceSide
    ? forcedChoiceColumnInstruction(question.forcedChoiceSide)
    : `Choose the option that describes you best. ${advanceNote}`;
}

/**
 * The instruction for one column of a forced-choice grid.
 *
 * Both columns offer the same four words, so the column is the only thing that
 * says whether the participant is naming their best or their worst fit.
 *
 * Both rendered instructions are built from this: `answerInstruction` for a singly
 * rendered item, `forcedChoiceGroupInstruction` for a grid screen. That is what
 * makes a side mean the same thing in either presentation, and it is why the
 * function rather than the two constants is the unit under test.
 */
export function forcedChoiceColumnInstruction(side: ForcedChoiceSide): string {
  return side === "least" ? leastColumnInstruction : mostColumnInstruction;
}

/**
 * The visible instruction for a whole forced-choice group screen, which holds
 * two answers and therefore needs both column instructions.
 *
 * It carries no advance promise: the participant moves between groups with the
 * explicit Previous and Next controls.
 *
 * It also deliberately does NOT repeat the exclusivity rule. `ForcedChoiceGroupTable`
 * renders that rule as its own visible line with every radio pointing at it
 * through `aria-describedby`, and printing the same sentence twice on one screen
 * adds noise without adding information. Both halves still come from this module,
 * so the wording stays single-sourced with what a singly rendered item would say.
 */
export function forcedChoiceGroupInstruction(): string {
  return `${forcedChoiceColumnInstruction(
    "most",
  )} ${forcedChoiceColumnInstruction("least")}`;
}

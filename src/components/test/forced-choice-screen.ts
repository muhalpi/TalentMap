import type { ForcedChoiceGroup } from "@/tests/shared/types";

/**
 * The rules of a forced-choice group screen, kept out of the runner component so
 * each one can be exercised directly. Everything here is pure: no DOM, no state,
 * no instrument import - the DISC item bank carries each adjective's scoring key
 * and must never reach the participant's browser.
 */

type Answers = Record<string, string | undefined>;

/**
 * How far a forced-choice group has got. `"partial"` exists as its own state on
 * purpose: a group with one column filled is not finished, and letting it look
 * finished in the group map is how a participant reaches the end of the
 * instrument believing they are done.
 */
export type GroupProgress = "empty" | "partial" | "complete";

/** How each group state is announced, so the map never relies on colour alone. */
export const groupProgressLabel: Record<GroupProgress, string> = {
  empty: "not answered",
  partial: "partly answered, one column still empty",
  complete: "answered",
};

export function groupProgressOf(
  answers: Answers,
  group: ForcedChoiceGroup,
): GroupProgress {
  const hasMost = Boolean(answers[group.mostQuestionId]);
  const hasLeast = Boolean(answers[group.leastQuestionId]);

  if (hasMost && hasLeast) {
    return "complete";
  }

  return hasMost || hasLeast ? "partial" : "empty";
}

/**
 * The persisted resume position is always a 0-based index into
 * `definition.questions`, whatever the presentation - `normalizeQuestionIndex` in
 * `src/services/participant-service.ts` documents and clamps it exactly that
 * way. A grid screen answers two of those questions, so a group is stored as its
 * MOST question index: group N (1-based) is index 2 * (N - 1), which holds
 * because a forced-choice item bank interleaves the two sides of each group -
 * an invariant `src/tests/registry.test.ts` asserts for every instrument that
 * publishes groups.
 *
 * These two helpers are the only place the conversion happens, so the stored
 * field keeps one meaning and a resumed grid lands on the group the participant
 * left rather than half way through the instrument.
 */
export function storedIndexForScreen(
  screenIndex: number,
  isGrid: boolean,
): number {
  return isGrid ? screenIndex * 2 : screenIndex;
}

export function screenIndexFromStored(
  storedIndex: number,
  isGrid: boolean,
): number {
  return isGrid ? Math.floor(storedIndex / 2) : storedIndex;
}

/** Keeps a screen index inside the instrument, whatever the source of the value. */
export function clampScreenIndex(index: number, screenCount: number): number {
  return Math.min(Math.max(index, 0), screenCount - 1);
}

/**
 * Which kind of interaction committed a grid answer.
 *
 * This matters because the two columns are real `<input type="radio">` elements,
 * and native radio behaviour CHECKS a radio as the arrow keys move focus onto it.
 * A keyboard user walking down the Least column to reach the fourth word
 * therefore commits the second and third words on the way past. Treating that as
 * a deliberate answer and advancing the screen would strand them on the next
 * group with a word they never chose, so only a pointer commit may advance.
 */
export type ForcedChoiceInputSource = "pointer" | "keyboard";

/**
 * How long after a pointer press a change event still counts as that press.
 *
 * A click or tap runs pointerdown -> pointerup -> click -> change within a few
 * milliseconds, so this is generous; it only has to be short enough that a
 * pointer press earlier in the same screen cannot be mistaken for the cause of a
 * later keyboard change.
 */
export const forcedChoicePointerWindowMs = 700;

/**
 * Classifies a change event by whether a pointer press immediately preceded it.
 *
 * Both timestamps are `event.timeStamp` values, which share one monotonic clock
 * with `performance.now()`. Anything that cannot be attributed to a pointer press
 * is treated as keyboard, which is the safe direction: the cost of a
 * misclassified pointer commit is that the participant presses Next themselves,
 * while the cost of a misclassified keyboard commit is being thrown off the group
 * mid-navigation.
 */
export function forcedChoiceInputSource(
  changedAt: number,
  lastPointerDownAt: number,
): ForcedChoiceInputSource {
  if (lastPointerDownAt <= 0) {
    return "keyboard";
  }

  const sincePointerDown = changedAt - lastPointerDownAt;

  return sincePointerDown >= 0 && sincePointerDown <= forcedChoicePointerWindowMs
    ? "pointer"
    : "keyboard";
}

/**
 * Whether answering a column should carry the participant to the next group.
 *
 * Four conditions, all required:
 * - the commit came from a pointer, for the reason above;
 * - the group was not already complete, so the FIRST of the two answers leaves
 *   the participant where they are;
 * - the group is complete now, so a correction inside a finished group does not
 *   throw them forward either;
 * - there is a next screen, so the last group stays put and offers Submit.
 */
export function shouldAdvanceAfterGroupAnswer({
  source,
  wasComplete,
  isComplete,
  screenIndex,
  screenCount,
}: {
  source: ForcedChoiceInputSource;
  wasComplete: boolean;
  isComplete: boolean;
  screenIndex: number;
  screenCount: number;
}): boolean {
  return (
    source === "pointer" &&
    !wasComplete &&
    isComplete &&
    screenIndex < screenCount - 1
  );
}

/**
 * "1 group incomplete" rather than "1 groups incomplete".
 *
 * Shown on the last screen next to Submit, which is exactly where a participant
 * is counting what is left, so the number and its noun have to agree.
 */
export function incompleteGroupsLabel(remaining: number): string {
  return `${remaining} ${remaining === 1 ? "group" : "groups"} incomplete`;
}

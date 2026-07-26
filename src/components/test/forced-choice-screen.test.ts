import assert from "node:assert/strict";
import test from "node:test";

import { discForcedChoiceGroups } from "@/tests/instruments/disc/questions";

import {
  clampScreenIndex,
  forcedChoiceInputSource,
  forcedChoicePointerWindowMs,
  groupProgressOf,
  incompleteGroupsLabel,
  screenIndexFromStored,
  shouldAdvanceAfterGroupAnswer,
  storedIndexForScreen,
} from "./forced-choice-screen";

const group9 = discForcedChoiceGroups[8];

function advanceWith(
  overrides: Partial<Parameters<typeof shouldAdvanceAfterGroupAnswer>[0]>,
) {
  return shouldAdvanceAfterGroupAnswer({
    source: "pointer",
    wasComplete: false,
    isComplete: true,
    screenIndex: 8,
    screenCount: 28,
    ...overrides,
  });
}

test("never advances the screen on a keyboard commit", () => {
  // The two columns are real radios, and the arrow keys CHECK a radio as focus
  // moves onto it. A keyboard user walking down the Least column to reach the
  // fourth word therefore commits the second and third on the way past; advancing
  // on that would store a word they never chose and take the group away before
  // they arrived. They move on with Next instead.
  assert.equal(advanceWith({ source: "keyboard" }), false);
  // Same commit from a pointer is a deliberate choice and does advance.
  assert.equal(advanceWith({ source: "pointer" }), true);
});

test("advances only on the answer that completes the group", () => {
  // The first of the two answers must leave the participant on the group.
  assert.equal(advanceWith({ isComplete: false }), false);
  // And correcting an answer inside a finished group must not throw them forward.
  assert.equal(advanceWith({ wasComplete: true, isComplete: true }), false);
});

test("never advances past the last group", () => {
  assert.equal(advanceWith({ screenIndex: 27, screenCount: 28 }), false);
  assert.equal(advanceWith({ screenIndex: 26, screenCount: 28 }), true);
});

test("reads a pointer press immediately before the change as a pointer commit", () => {
  assert.equal(forcedChoiceInputSource(1_000, 1_000), "pointer");
  assert.equal(forcedChoiceInputSource(1_012, 1_000), "pointer");
  assert.equal(
    forcedChoiceInputSource(1_000 + forcedChoicePointerWindowMs, 1_000),
    "pointer",
  );
});

test("treats anything it cannot attribute to a pointer press as keyboard", () => {
  // No pointer press at all in this screen.
  assert.equal(forcedChoiceInputSource(1_000, 0), "keyboard");
  // A pointer press from earlier in the screen, then arrow-key navigation.
  assert.equal(
    forcedChoiceInputSource(1_001 + forcedChoicePointerWindowMs, 1_000),
    "keyboard",
  );
  // A stale timestamp from after the change cannot have caused it.
  assert.equal(forcedChoiceInputSource(1_000, 2_000), "keyboard");
});

test("counts a group as complete only when both columns are answered", () => {
  assert.equal(groupProgressOf({}, group9), "empty");
  assert.equal(groupProgressOf({ g09m: "A" }, group9), "partial");
  assert.equal(groupProgressOf({ g09l: "A" }, group9), "partial");
  assert.equal(groupProgressOf({ g09m: "A", g09l: "B" }, group9), "complete");
  // A cleared answer arrives as an empty value, and must not count as answered -
  // otherwise a half-filled group would look finished in the group map and the
  // participant would reach the end believing they were done.
  assert.equal(groupProgressOf({ g09m: "A", g09l: "" }, group9), "partial");
  assert.equal(groupProgressOf({ g09m: "", g09l: "" }, group9), "empty");
  // An equal pair is still complete: it is invalid, reported separately, and must
  // not read as unanswered, or the participant would be sent hunting for a gap.
  assert.equal(groupProgressOf({ g09m: "A", g09l: "A" }, group9), "complete");
});

test("round trips every group screen through the stored question index", () => {
  // The stored resume position is a 0-based index into the 56 questions for every
  // presentation, so a group travels as its MOST question index. Group 9 is 16.
  assert.equal(storedIndexForScreen(8, true), 16);
  assert.equal(screenIndexFromStored(16, true), 8);

  discForcedChoiceGroups.forEach((group, screenIndex) => {
    const stored = storedIndexForScreen(screenIndex, true);

    assert.equal(stored, (group.group - 1) * 2, `group ${group.group} stored index`);
    assert.equal(
      screenIndexFromStored(stored, true),
      screenIndex,
      `group ${group.group} resumes on its own screen`,
    );
    // The LEAST side of the same group resolves to the same screen, so a draft
    // saved against either question cannot land on a neighbouring group.
    assert.equal(screenIndexFromStored(stored + 1, true), screenIndex);
  });
});

test("leaves the index alone for a single-question instrument", () => {
  // BFI and MBTI store the question index itself. The conversion must be the
  // identity for them, or every resume would jump.
  for (const index of [0, 1, 17, 49, 69]) {
    assert.equal(storedIndexForScreen(index, false), index);
    assert.equal(screenIndexFromStored(index, false), index);
  }
});

test("clamps a screen index into the instrument", () => {
  assert.equal(clampScreenIndex(-5, 28), 0);
  assert.equal(clampScreenIndex(0, 28), 0);
  assert.equal(clampScreenIndex(27, 28), 27);
  assert.equal(clampScreenIndex(999, 28), 27);
});

test("agrees with the number it prints", () => {
  assert.equal(incompleteGroupsLabel(1), "1 group incomplete");
  assert.equal(incompleteGroupsLabel(2), "2 groups incomplete");
  assert.equal(incompleteGroupsLabel(28), "28 groups incomplete");
});

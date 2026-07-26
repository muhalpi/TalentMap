import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { testRegistry } from "@/tests/registry";

import {
  answerInstruction,
  forcedChoiceColumnInstruction,
  forcedChoiceExclusivityRule,
  forcedChoiceGroupInstruction,
} from "./answer-instruction";

test("never tells a DISC respondent to pick a best fit on a LEAST item", () => {
  // DISC is ipsative: following a best-fit instruction on a LEAST item inflates
  // the Least tally for the dimension the respondent identifies with, which flips
  // the sign of the change score the whole profile is derived from. Assert against
  // every one of the 56 items rather than a sample.
  //
  // Read from the DEFINITION, not from the item bank: the definition's questions
  // are the payload the participant's browser receives, and carrying the side
  // there is what lets the runner word the instruction without importing the bank
  // - which also holds every adjective's D/I/S/C keying.
  let leastItems = 0;
  let mostItems = 0;

  for (const question of testRegistry.disc.questions) {
    const instruction = answerInstruction(question);
    const asksForLeast = question.prompt.includes("LEAST");

    assert.ok(
      !/describes you best/.test(instruction),
      `question ${question.no} must not use the best-fit instruction`,
    );
    // The prompt and the declared side have to agree, or the instruction would be
    // correct against the payload and wrong against the item the respondent reads.
    assert.equal(
      question.forcedChoiceSide,
      asksForLeast ? "least" : "most",
      `question ${question.no} declares the wrong side`,
    );

    if (asksForLeast) {
      leastItems += 1;
      assert.match(instruction, /LEAST like you/);
      assert.doesNotMatch(instruction, /MOST like you/);
      assert.equal(instruction, forcedChoiceColumnInstruction("least"));
    } else {
      mostItems += 1;
      assert.match(instruction, /MOST like you/);
      assert.doesNotMatch(instruction, /LEAST like you/);
      assert.equal(instruction, forcedChoiceColumnInstruction("most"));
    }

    // Changed deliberately when DISC moved to one group per screen. A DISC screen
    // now holds a Most and a Least answer and the participant advances with the
    // explicit Next control, so no DISC item may promise that a single selection
    // moves them on. The MOST/LEAST assertions above are the ones that protect
    // scoring, and they are unchanged.
    assert.doesNotMatch(instruction, /move to the next question/);
  }

  assert.equal(leastItems, 28);
  assert.equal(mostItems, 28);
});

test("keeps the best-fit instruction for the best-fit instruments", () => {
  const bestFit =
    "Choose the option that describes you best. Your selection will move to the next question automatically.";

  for (const testKey of ["bfi", "mbti"] as const) {
    for (const question of testRegistry[testKey].questions) {
      // Neither instrument is forced-choice, so no item may declare a side; that
      // absence is what keeps their instruction the one they have always shown.
      assert.equal(
        question.forcedChoiceSide,
        undefined,
        `${testKey} question ${question.no} must not declare a forced-choice side`,
      );
      assert.equal(
        answerInstruction(question),
        bestFit,
        `${testKey} question ${question.no}`,
      );
    }
  }
});

test("falls back to the best-fit instruction for an item that declares no side", () => {
  // The side is the only thing that can classify an item, so an item without one
  // degrades to the neutral instruction rather than guessing from its prompt.
  assert.equal(
    answerInstruction({
      id: "g01m",
      no: 1,
      prompt: "Group 1 of 28 - which word describes you MOST?",
      options: [],
    }),
    "Choose the option that describes you best. Your selection will move to the next question automatically.",
  );
});

test("words each forced-choice column as its own side", () => {
  const most = forcedChoiceColumnInstruction("most");
  const least = forcedChoiceColumnInstruction("least");

  assert.match(most, /MOST like you/);
  assert.doesNotMatch(most, /LEAST like you/);
  assert.match(least, /LEAST like you/);
  assert.doesNotMatch(least, /MOST like you/);
  assert.notEqual(most, least);
});

test("keeps the best-fit wording out of every forced-choice string", () => {
  // "Choose the option that describes you best" is correct for a best-fit
  // instrument and wrong for both halves of a forced choice: on the LEAST side it
  // inverts the item, and on a group screen it hides that two answers are wanted.
  // No string a DISC participant can be shown may carry it.
  for (const instruction of [
    forcedChoiceColumnInstruction("most"),
    forcedChoiceColumnInstruction("least"),
    forcedChoiceGroupInstruction(),
    forcedChoiceExclusivityRule,
  ]) {
    assert.doesNotMatch(instruction, /describes you best/);
  }
});

test("states the exclusivity rule in the wording the grid shows", () => {
  // The grid renders this exact sentence as its visible rule line and points
  // every radio at it with aria-describedby, so the copy is pinned here.
  assert.equal(
    forcedChoiceExclusivityRule,
    "A word cannot be both Most and Least.",
  );
});

test("shows every exported instruction somewhere in the product", () => {
  // An instruction that exists, is unit-tested, and is rendered nowhere is worse
  // than no instruction: the tests report the wording as covered while the
  // participant is shown nothing. This repo has no component test harness, so each
  // string is pinned to the component that renders it - deleting a call site fails
  // here instead of passing quietly.
  const read = (repoRelativePath: string) =>
    readFileSync(path.join(process.cwd(), repoRelativePath), "utf8");
  const runner = read("src/components/test/participant-test-runner.tsx");
  const grid = read("src/components/test/forced-choice-group-table.tsx");

  // The single-question instruction row.
  assert.match(runner, /\{answerInstruction\(question\)\}/);
  // The grid screen's instruction row, via the module constant it is held in.
  assert.match(runner, /forcedChoiceGroupInstruction\(\)/);
  assert.match(runner, /\{forcedChoiceScreenInstruction\}/);
  // The grid's visible rule line, which every radio points at with
  // aria-describedby.
  assert.match(grid, /\{forcedChoiceExclusivityRule\}/);
});

test("gives a group screen both column instructions and no duplicate rule", () => {
  const instruction = forcedChoiceGroupInstruction();

  assert.ok(instruction.includes(forcedChoiceColumnInstruction("most")));
  assert.ok(instruction.includes(forcedChoiceColumnInstruction("least")));
  // A group screen takes two answers and is advanced by the Next control, so it
  // must not promise that a selection advances it.
  assert.doesNotMatch(instruction, /move to the next question/);
  // The rule belongs to the grid's own visible line, which every radio points at
  // with aria-describedby. Repeating it in the screen instruction would print the
  // same sentence twice, so this string deliberately leaves it out - the rule is
  // still pinned by the test above and rendered by ForcedChoiceGroupTable.
  assert.ok(!instruction.includes(forcedChoiceExclusivityRule));
});

import assert from "node:assert/strict";
import test from "node:test";

import { bfiDefinition } from "./instruments/bfi/definition";
import { discDefinition } from "./instruments/disc/definition";
import {
  currentImplementedTestRows,
  getTestDefinition,
  isCurrentImplementedTest,
  testRegistry,
} from "./registry";
import type { TestDefinition, TestKey } from "./shared/types";

test("recognizes only the current implemented BFI version", () => {
  assert.equal(
    isCurrentImplementedTest("bfi", bfiDefinition.version),
    true,
  );
  assert.equal(
    isCurrentImplementedTest("bfi", "ipip-bfm-50-en-1.0.0"),
    false,
  );
});

test("recognizes only the current implemented DISC version", () => {
  assert.equal(
    isCurrentImplementedTest("disc", discDefinition.version),
    true,
  );
  assert.equal(
    isCurrentImplementedTest("disc", "disc-classic-28-en-tm-0.9.0"),
    false,
  );
});

test("does not expose reserved instruments for client delivery", () => {
  assert.equal(getTestDefinition("papi").implemented, false);
  assert.equal(isCurrentImplementedTest("papi", "pending-adaptation"), false);
});

test("selects the current scoring row when a tenant retains an older version", () => {
  const current = {
    testKey: "bfi",
    version: bfiDefinition.version,
    quotaTotal: 250,
  };
  const rows = currentImplementedTestRows([
    {
      testKey: "bfi",
      version: "ipip-bfm-50-en-1.0.0",
      quotaTotal: 50,
    },
    current,
  ]);

  assert.deepEqual(rows, [current]);
});

test("presents DISC as 28 forced-choice group screens", () => {
  // The runner switches to the Most/Least grid on these three fields, so they are
  // the contract between the definition and the participant screen.
  assert.equal(discDefinition.presentation, "forced-choice-grid");
  assert.equal(discDefinition.exclusiveWithinGroup, true);
  assert.equal(discDefinition.forcedChoiceGroups?.length, 28);
  // Presentation changed, storage did not: 28 screens still stand on 56 questions.
  assert.equal(discDefinition.questions.length, 56);
});

test("keeps every other instrument on the single-question path", () => {
  // BFI and MBTI must be indistinguishable from how they were before forced-choice
  // presentation existed. The runner reads an absent `presentation` as
  // "single-question", so either an absent field or that literal is correct, and an
  // empty group list is what keeps the grid branch unreachable for them.
  for (const testKey of ["bfi", "mbti"] as const) {
    const definition = getTestDefinition(testKey);

    assert.equal(definition.presentation ?? "single-question", "single-question");
    assert.notEqual(definition.presentation, "forced-choice-grid");
    assert.equal((definition.forcedChoiceGroups ?? []).length, 0);
    assert.equal(definition.exclusiveWithinGroup ?? false, false);
  }

  assert.equal(bfiDefinition.questions.length, 50);
  assert.equal(getTestDefinition("mbti").questions.length, 70);

  // Only DISC opts in, across the whole registry - a reserved instrument that
  // quietly declared a grid would change its participant experience.
  const gridKeys = (Object.entries(testRegistry) as Array<
    [TestKey, TestDefinition]
  >)
    .filter(([, definition]) => definition.presentation === "forced-choice-grid")
    .map(([key]) => key);

  assert.deepEqual(gridKeys, ["disc"]);
});

test("keeps forced-choice group metadata consistent with the item bank", () => {
  // Applied to every registered instrument, so a forced-choice instrument added
  // later is held to the same rules rather than only DISC being checked.
  for (const [testKey, definition] of Object.entries(testRegistry) as Array<
    [TestKey, TestDefinition]
  >) {
    const groups = definition.forcedChoiceGroups ?? [];

    if (groups.length === 0) {
      // The flag alone does nothing: without groups there is no pair to compare,
      // so declaring exclusivity would be a silent no-op.
      assert.notEqual(
        definition.exclusiveWithinGroup,
        true,
        `${testKey} declares exclusivity without any groups`,
      );
      continue;
    }

    assert.equal(
      definition.presentation,
      "forced-choice-grid",
      `${testKey} publishes groups without declaring the grid presentation`,
    );

    const questionsById = new Map(
      definition.questions.map((question) => [question.id, question]),
    );

    for (const group of groups) {
      const most = questionsById.get(group.mostQuestionId);
      const least = questionsById.get(group.leastQuestionId);

      assert.ok(
        most,
        `${testKey} group ${group.group} names the unknown id ${group.mostQuestionId}`,
      );
      assert.ok(
        least,
        `${testKey} group ${group.group} names the unknown id ${group.leastQuestionId}`,
      );
      assert.notEqual(
        group.mostQuestionId,
        group.leastQuestionId,
        `${testKey} group ${group.group} stores both sides in one question`,
      );
      // The grid renders one row per option with a cell in each column, so a side
      // whose options differ from the group's would render an unanswerable cell.
      assert.deepEqual(most.options, group.options);
      assert.deepEqual(least.options, group.options);
      assert.ok(
        group.label.trim().length > 0,
        `${testKey} group ${group.group} has no label`,
      );
      // The participant's browser words its instruction per side and must not
      // import the item bank to learn it, because the bank also holds the scoring
      // keys. The side therefore has to be on the public payload.
      assert.equal(
        most.forcedChoiceSide,
        "most",
        `${testKey} question ${group.mostQuestionId} does not declare its side`,
      );
      assert.equal(
        least.forcedChoiceSide,
        "least",
        `${testKey} question ${group.leastQuestionId} does not declare its side`,
      );
    }

    // The runner stores a grid screen as the group's MOST question index and
    // resumes by halving it, because the stored resume position means one thing
    // for every presentation: an index into `questions`. That only lands on the
    // right group if the item bank interleaves the two sides of each group, so
    // the positional invariant is asserted here rather than left implicit. A bank
    // listing all 28 MOST items before the LEAST ones would satisfy every
    // assertion above and still resume a participant onto the wrong screen.
    assert.equal(
      definition.questions.length,
      groups.length * 2,
      `${testKey} has questions outside its ${groups.length} groups`,
    );

    groups.forEach((group, index) => {
      assert.equal(
        definition.questions[index * 2].id,
        group.mostQuestionId,
        `${testKey} group ${group.group} MOST is not at question index ${index * 2}`,
      );
      assert.equal(
        definition.questions[index * 2 + 1].id,
        group.leastQuestionId,
        `${testKey} group ${group.group} LEAST is not at question index ${
          index * 2 + 1
        }`,
      );
    });
  }
});

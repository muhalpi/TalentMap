import assert from "node:assert/strict";
import test from "node:test";

import { discForcedChoiceGroups } from "@/tests/instruments/disc/questions";
import {
  forcedChoiceConflictGroupList,
  forcedChoiceGroupConflicts,
} from "@/tests/shared/forced-choice";
import type { ForcedChoiceGroup } from "@/tests/shared/types";

/**
 * Two groups with no instrument behind them, so the rule is exercised on its own
 * terms rather than through DISC. This is the point of the module: a forced-choice
 * instrument added later is judged by the same code, with no entry needed here.
 */
const groups: ForcedChoiceGroup[] = [
  {
    group: 1,
    label: "Group 1 of 2",
    options: [
      { value: "A", label: "First" },
      { value: "B", label: "Second" },
    ],
    mostQuestionId: "x01m",
    leastQuestionId: "x01l",
  },
  {
    group: 2,
    label: "Group 2 of 2",
    options: [
      { value: "A", label: "First" },
      { value: "B", label: "Second" },
    ],
    mostQuestionId: "x02m",
    leastQuestionId: "x02l",
  },
];

test("reports a group whose two sides answer the same option", () => {
  assert.deepEqual(
    forcedChoiceGroupConflicts(groups, { x01m: "B", x01l: "B" }),
    [
      {
        group: 1,
        mostQuestionId: "x01m",
        leastQuestionId: "x01l",
        value: "B",
      },
    ],
  );
});

test("reports nothing when the two sides differ", () => {
  assert.deepEqual(
    forcedChoiceGroupConflicts(groups, {
      x01m: "A",
      x01l: "B",
      x02m: "B",
      x02l: "A",
    }),
    [],
  );
});

test("treats a half-answered group as a legitimate partial state", () => {
  // Drafts are partial by nature. One side alone can never be a conflict, and an
  // empty value is a cleared answer rather than a match against the other empty
  // side - the runner sends "" instead of removing the key.
  for (const partial of [
    {},
    { x01m: "A" },
    { x01l: "A" },
    { x01m: "", x01l: "" },
    { x01m: "A", x01l: "" },
    { x01m: undefined, x01l: undefined },
  ]) {
    assert.deepEqual(
      forcedChoiceGroupConflicts(groups, partial),
      [],
      `${JSON.stringify(partial)} is not a conflict`,
    );
  }
});

test("judges each group on its own, not the values across groups", () => {
  // Repeating a letter in a DIFFERENT group is ordinary: each group is its own
  // forced choice over its own four words.
  assert.deepEqual(
    forcedChoiceGroupConflicts(groups, {
      x01m: "A",
      x01l: "B",
      x02m: "A",
      x02l: "B",
    }),
    [],
  );
});

test("returns conflicts in the order the groups are given", () => {
  assert.deepEqual(
    forcedChoiceGroupConflicts(groups, {
      x02m: "A",
      x02l: "A",
      x01m: "B",
      x01l: "B",
    }).map((conflict) => conflict.group),
    [1, 2],
  );
});

test("has nothing to say about an instrument with no groups", () => {
  assert.deepEqual(forcedChoiceGroupConflicts([], { q1: "A", q2: "A" }), []);
});

test("judges the real 28 DISC groups by the same rule", () => {
  // DISC keeps no copy of the rule: it declares `exclusiveWithinGroup` and every
  // enforcement point evaluates this function against its groups. Pinned against
  // the real 28 so the generic tests above cannot pass while the instrument the
  // rule was written for behaves differently.
  const answers: Record<string, string> = {};

  for (const group of discForcedChoiceGroups) {
    answers[group.mostQuestionId] = group.options[0].value;
    answers[group.leastQuestionId] = group.options[1].value;
  }

  assert.deepEqual(forcedChoiceGroupConflicts(discForcedChoiceGroups, answers), []);

  answers.g09l = answers.g09m;
  answers.g14l = answers.g14m;

  assert.deepEqual(
    forcedChoiceGroupConflicts(discForcedChoiceGroups, answers).map(
      (conflict) => conflict.group,
    ),
    [9, 14],
  );
});

test("names conflicting groups the way both gates report them", () => {
  assert.equal(forcedChoiceConflictGroupList([9]), "Group 9");
  assert.equal(forcedChoiceConflictGroupList([9, 14]), "Groups 9 and 14");
  assert.equal(forcedChoiceConflictGroupList([9, 14, 22]), "Groups 9, 14 and 22");
  // Unreachable from the callers, which check for conflicts first, but it must not
  // interpolate "undefined" into a sentence a participant reads.
  assert.equal(forcedChoiceConflictGroupList([]), "No group");
});

import assert from "node:assert/strict";
import test from "node:test";

import { forcedChoiceGroupConflicts } from "@/tests/shared/forced-choice";
import type { AnswerMap } from "@/tests/shared/types";

import type { DiscQuestionDefinition } from "./questions";
import { discForcedChoiceGroups, discQuestions } from "./questions";
import { discTermGroups } from "./terms";

/**
 * The item bank indexed by id.
 *
 * Built here rather than exported from `questions.ts`: nothing in the product
 * looks an item up by id - `definition.ts` maps over `discQuestions` and
 * `scoring.ts` iterates it - so an exported index would be public API with no
 * consumer but this file. The uniqueness the index depends on is asserted below,
 * in "keeps the 56-question storage contract behind the 28 group screens".
 */
const discQuestionById: Record<string, DiscQuestionDefinition> =
  Object.fromEntries(discQuestions.map((question) => [question.id, question]));

/**
 * The exclusivity rule as it applies to DISC. There is no DISC-specific copy of
 * it: the instrument declares `exclusiveWithinGroup` and every enforcement point
 * evaluates the shared rule against these 28 groups, so this is the same call the
 * grid UI, draft save, submit, and result import each make.
 */
function discGroupConflicts(answers: Record<string, string | undefined>) {
  return forcedChoiceGroupConflicts(discForcedChoiceGroups, answers);
}

function groupAt(groupNumber: number) {
  const group = discForcedChoiceGroups.find(
    (candidate) => candidate.group === groupNumber,
  );

  assert.ok(group, `DISC has no forced-choice group ${groupNumber}`);

  return group;
}

/**
 * A valid forced-choice response: the first listed word as MOST and the second
 * as LEAST in every group. Built from the payload rather than transcribed, so it
 * follows the item bank instead of duplicating it, and the two sides differ in
 * every group because the four options are distinct positions.
 */
function differingAnswers(): AnswerMap {
  const answers: AnswerMap = {};

  for (const group of discForcedChoiceGroups) {
    answers[group.mostQuestionId] = group.options[0].value;
    answers[group.leastQuestionId] = group.options[1].value;
  }

  return answers;
}

function withEqualPairs(groupNumbers: number[]): AnswerMap {
  const answers = differingAnswers();

  for (const groupNumber of groupNumbers) {
    const group = groupAt(groupNumber);
    answers[group.leastQuestionId] = answers[group.mostQuestionId];
  }

  return answers;
}

test("presents one forced-choice group per adjective group in the bank", () => {
  assert.equal(discForcedChoiceGroups.length, 28);
  assert.equal(discForcedChoiceGroups.length, discTermGroups.length);
  assert.deepEqual(
    discForcedChoiceGroups.map((group) => group.group),
    discTermGroups.map((group) => group.group),
  );
  // The grid renders these in array order, so the numbering has to be the bank's
  // own 1..28 in ascending order rather than merely the same set.
  assert.deepEqual(
    discForcedChoiceGroups.map((group) => group.group),
    Array.from({ length: 28 }, (_unused, index) => index + 1),
  );

  for (const group of discForcedChoiceGroups) {
    assert.equal(
      group.label,
      `Group ${group.group} of 28`,
      `group ${group.group} label`,
    );
  }
});

test("derives every group's options from the item bank in display order", () => {
  // The payload cannot be allowed to drift from the bank: a reordered or relabelled
  // option list would change which adjective the stored letter means, and the
  // stored letters are what scoring reads.
  discForcedChoiceGroups.forEach((group, index) => {
    const bankGroup = discTermGroups[index];

    assert.equal(group.group, bankGroup.group);
    assert.deepEqual(
      group.options,
      bankGroup.terms.map((term) => ({
        value: term.position,
        label: term.term,
      })),
      `group ${group.group} options must match the item bank`,
    );
    assert.deepEqual(
      group.options.map((option) => option.value),
      ["A", "B", "C", "D"],
      `group ${group.group} must offer A-D in display order`,
    );

    for (const option of group.options) {
      // Meaning-bearing labels are the whole item; a blank or shortened one would
      // silently change what the respondent is answering.
      assert.ok(
        option.label.trim().length > 0,
        `group ${group.group} option ${option.value} has no label`,
      );
      assert.doesNotMatch(
        option.label,
        /[.…]{2,}/,
        `group ${group.group} option ${option.value} looks truncated`,
      );
    }
  });
});

test("points each group at the two question ids that store its answers", () => {
  for (const group of discForcedChoiceGroups) {
    const slug = `g${String(group.group).padStart(2, "0")}`;

    assert.equal(group.mostQuestionId, `${slug}m`);
    assert.equal(group.leastQuestionId, `${slug}l`);

    const most = discQuestionById[group.mostQuestionId];
    const least = discQuestionById[group.leastQuestionId];

    assert.ok(most, `${group.mostQuestionId} is not in the item bank`);
    assert.ok(least, `${group.leastQuestionId} is not in the item bank`);
    assert.equal(most.kind, "most");
    assert.equal(least.kind, "least");
    assert.equal(most.group, group.group);
    assert.equal(least.group, group.group);
    assert.equal(most.no, group.group * 2 - 1);
    assert.equal(least.no, group.group * 2);
    // Both columns of the grid render one option list, so both sides must offer
    // exactly the options the group publishes.
    assert.deepEqual(most.options, group.options);
    assert.deepEqual(least.options, group.options);
  }
});

test("matches the requested group screen for group 9", () => {
  assert.deepEqual(groupAt(9), {
    group: 9,
    label: "Group 9 of 28",
    options: [
      { value: "A", label: "Neighborly" },
      { value: "B", label: "Careful" },
      { value: "C", label: "Appealing" },
      { value: "D", label: "Restless" },
    ],
    mostQuestionId: "g09m",
    leastQuestionId: "g09l",
  });
});

test("keeps the 56-question storage contract behind the 28 group screens", () => {
  // Presentation changed; storage did not. Draft autosave, resume, submission,
  // scoring, and the XLSX q01..q56 round trip all read these ids.
  assert.equal(discQuestions.length, 56);

  const expectedIds = discForcedChoiceGroups.flatMap((group) => [
    group.mostQuestionId,
    group.leastQuestionId,
  ]);

  assert.deepEqual(
    discQuestions.map((question) => question.id),
    expectedIds,
  );
  assert.equal(expectedIds[0], "g01m");
  assert.equal(expectedIds.at(-1), "g28l");
  assert.equal(new Set(expectedIds).size, 56);

  discQuestions.forEach((question, index) => {
    assert.equal(question.no, index + 1, `${question.id} question number`);
    assert.equal(question.options.length, 4);

    for (const option of question.options) {
      assert.ok(
        ["A", "B", "C", "D"].includes(option.value),
        `${question.id} offers the out-of-range value "${option.value}"`,
      );
    }

    assert.equal(discQuestionById[question.id].kind, question.kind);
  });

  // The side has to be resolvable from the id alone, because it is what tells a
  // MOST item from a LEAST one everywhere the two are handled differently -
  // scoring reads it here, and `definition.ts` copies it onto the public payload
  // for the participant screen.
  assert.equal(discQuestionById["g09m"].kind, "most");
  assert.equal(discQuestionById["g09l"].kind, "least");
  assert.equal(discQuestionById["not-a-disc-question"], undefined);
});

test("reports no conflict when both sides of every group differ", () => {
  assert.deepEqual(discGroupConflicts(differingAnswers()), []);

  // Repeating a letter across different groups is ordinary - each group is its
  // own forced choice - so the rule must be per group, not per value.
  const sharedLetters: AnswerMap = {};
  for (const group of discForcedChoiceGroups) {
    sharedLetters[group.mostQuestionId] = "A";
    sharedLetters[group.leastQuestionId] = "B";
  }
  assert.deepEqual(discGroupConflicts(sharedLetters), []);
});

test("reports no conflict for a group with only one side answered", () => {
  // Drafts are legitimately partial: a half-filled group is a normal state on the
  // way to a complete one and must keep autosaving.
  const group = groupAt(9);

  for (const partial of [
    {},
    { [group.mostQuestionId]: "C" },
    { [group.leastQuestionId]: "C" },
    // A cleared radio arrives as an empty value rather than a missing key, and
    // must not read as a match against the other empty side.
    { [group.mostQuestionId]: "", [group.leastQuestionId]: "" },
    { [group.mostQuestionId]: "C", [group.leastQuestionId]: "" },
    { [group.mostQuestionId]: undefined, [group.leastQuestionId]: undefined },
  ]) {
    assert.deepEqual(
      discGroupConflicts(partial),
      [],
      `${JSON.stringify(partial)} is not a conflict`,
    );
  }

  // Every group behaves the same way, not just the one used above.
  for (const candidate of discForcedChoiceGroups) {
    assert.deepEqual(
      discGroupConflicts({ [candidate.mostQuestionId]: "D" }),
      [],
      `group ${candidate.group} most-only`,
    );
    assert.deepEqual(
      discGroupConflicts({ [candidate.leastQuestionId]: "D" }),
      [],
      `group ${candidate.group} least-only`,
    );
  }
});

test("reports exactly the groups that use one word on both sides", () => {
  const answers = withEqualPairs([22, 9, 14]);

  assert.deepEqual(discGroupConflicts(answers), [
    {
      group: 9,
      mostQuestionId: "g09m",
      leastQuestionId: "g09l",
      value: answers.g09m,
    },
    {
      group: 14,
      mostQuestionId: "g14m",
      leastQuestionId: "g14l",
      value: answers.g14m,
    },
    {
      group: 22,
      mostQuestionId: "g22m",
      leastQuestionId: "g22l",
      value: answers.g22m,
    },
  ]);

  // Any of the four letters counts, not only the first option.
  for (const value of ["A", "B", "C", "D"]) {
    assert.deepEqual(
      discGroupConflicts({ g05m: value, g05l: value }),
      [
        {
          group: 5,
          mostQuestionId: "g05m",
          leastQuestionId: "g05l",
          value,
        },
      ],
      `an equal pair of "${value}" is a conflict`,
    );
  }
});

test("reports all 28 groups when every group repeats its word", () => {
  const conflicts = discGroupConflicts(
    withEqualPairs(discForcedChoiceGroups.map((group) => group.group)),
  );

  assert.equal(conflicts.length, 28);
  assert.deepEqual(
    conflicts.map((conflict) => conflict.group),
    discForcedChoiceGroups.map((group) => group.group),
  );

  for (const conflict of conflicts) {
    const group = groupAt(conflict.group);

    assert.equal(conflict.mostQuestionId, group.mostQuestionId);
    assert.equal(conflict.leastQuestionId, group.leastQuestionId);
    assert.equal(conflict.value, group.options[0].value);
  }
});

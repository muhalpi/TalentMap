import assert from "node:assert/strict";
import test from "node:test";

import {
  assertExclusiveWithinGroup,
  saveParticipantAnswerDraft,
  submitParticipantResult,
} from "@/services/participant-service";
import { discForcedChoiceGroups } from "@/tests/instruments/disc/questions";
import { getTestDefinition } from "@/tests/registry";
import type { AnswerMap } from "@/tests/shared/types";

const disc = getTestDefinition("disc");

/**
 * One answer per DISC question, taken from the item bank so the fixture follows
 * the definition instead of transcribing it. The MOST side always takes the
 * first listed word and the LEAST side the second, which is a valid response
 * because the two differ in every group.
 */
function discAnswers(): AnswerMap {
  const answers: AnswerMap = {};

  for (const group of discForcedChoiceGroups) {
    answers[group.mostQuestionId] = group.options[0].value;
    answers[group.leastQuestionId] = group.options[1].value;
  }

  return answers;
}

function groupAt(groupNumber: number) {
  const group = discForcedChoiceGroups.find(
    (candidate) => candidate.group === groupNumber,
  );

  assert.ok(group, `DISC has no group ${groupNumber}`);

  return group;
}

test("accepts a forced-choice answer set that differs on both sides", () => {
  assert.doesNotThrow(() => assertExclusiveWithinGroup(disc, discAnswers()));
});

test("accepts a partially answered forced-choice group", () => {
  // Drafts are legitimately partial: a participant who has picked Most and not
  // yet Least must keep autosaving, and one side alone can never be a conflict.
  const group = groupAt(9);

  for (const partial of [
    { [group.mostQuestionId]: "C" },
    { [group.leastQuestionId]: "C" },
    // A cleared radio arrives as an empty value rather than a missing key; it
    // must not read as a match against the other empty side.
    { [group.mostQuestionId]: "", [group.leastQuestionId]: "" },
    {},
  ]) {
    assert.doesNotThrow(() => assertExclusiveWithinGroup(disc, partial));
  }
});

test("rejects a forced-choice group that uses one word for both sides", () => {
  const group = groupAt(9);
  const answers = discAnswers();
  answers[group.leastQuestionId] = answers[group.mostQuestionId];

  assert.throws(
    () => assertExclusiveWithinGroup(disc, answers),
    /^Error: Group 9 cannot use the same word for Most and Least\.$/,
  );
});

test("rejects a partial draft that already holds an equal pair", () => {
  // The conflict is rejected on its own, without waiting for the other 54
  // answers, so autosave cannot store a state the participant would resume into.
  const group = groupAt(14);

  assert.throws(
    () =>
      assertExclusiveWithinGroup(disc, {
        [group.mostQuestionId]: "B",
        [group.leastQuestionId]: "B",
      }),
    /Group 14 cannot use the same word for Most and Least\./,
  );
});

test("names every conflicting group in ascending order", () => {
  const answers = discAnswers();
  for (const groupNumber of [22, 9, 14]) {
    const group = groupAt(groupNumber);
    answers[group.leastQuestionId] = answers[group.mostQuestionId];
  }

  assert.throws(
    () => assertExclusiveWithinGroup(disc, answers),
    /^Error: Groups 9, 14 and 22 cannot use the same word for Most and Least\.$/,
  );
});

test("names all 28 groups when every group repeats its word", () => {
  const answers = discAnswers();
  for (const group of discForcedChoiceGroups) {
    answers[group.leastQuestionId] = answers[group.mostQuestionId];
  }

  assert.throws(() => assertExclusiveWithinGroup(disc, answers), (error) => {
    assert.ok(error instanceof Error);
    // Every group is named, in ascending order, with the last joined by "and".
    assert.equal(
      error.message,
      `Groups ${discForcedChoiceGroups
        .slice(0, -1)
        .map((group) => group.group)
        .join(", ")} and 28 cannot use the same word for Most and Least.`,
    );
    return true;
  });
});

test("leaves single-question instruments alone", () => {
  // BFI and MBTI declare no groups and no exclusivity, so repeated answer
  // values across their questions are ordinary responses, not conflicts.
  for (const testKey of ["bfi", "mbti"] as const) {
    const definition = getTestDefinition(testKey);

    assert.equal(definition.exclusiveWithinGroup ?? false, false);
    assert.doesNotThrow(() =>
      assertExclusiveWithinGroup(
        definition,
        Object.fromEntries(
          definition.questions.map((question) => [
            question.id,
            question.options[0].value,
          ]),
        ),
      ),
    );
  }
});

// The tests below run the real write paths, not just the shared gate. A demo
// access resolves its context without a database, so submitParticipantResult
// executes end to end - the exclusivity check, then scoring - and returns an
// unpersisted result. Draft save takes the same gate immediately after
// normalizing the answers; that call is covered by the assertions above, because
// its database half has no harness in this repo.

test("submits a DISC response whose groups differ on both sides", async () => {
  const submitted = await submitParticipantResult("demo-disc", discAnswers());

  assert.equal(submitted.persisted, false);
  assert.equal(submitted.score.summary.model, "DISC");
  // Nothing that reaches submit can hold an equal pair any more, so a freshly
  // captured result has to report zero cancelled groups.
  assert.equal(submitted.score.summary.ambiguousGroups, 0);
});

test("refuses to submit a DISC response that repeats a word, and names the group", async () => {
  const group = groupAt(9);
  const answers = discAnswers();
  answers[group.leastQuestionId] = answers[group.mostQuestionId];

  await assert.rejects(
    () => submitParticipantResult("demo-disc", answers),
    /^Error: Group 9 cannot use the same word for Most and Least\.$/,
  );
});

test("refuses a repeated word before it tries to score the response", async () => {
  // Only the two conflicting answers are present. Scoring would reject this map
  // for the 54 missing ones, so the group message proves the exclusivity check
  // runs first and the participant is told which group to reopen instead of
  // getting a generic scoring failure.
  const group = groupAt(9);

  await assert.rejects(
    () =>
      submitParticipantResult("demo-disc", {
        [group.mostQuestionId]: "C",
        [group.leastQuestionId]: "C",
      }),
    /^Error: Group 9 cannot use the same word for Most and Least\.$/,
  );
});

test("still reports an incomplete DISC response when no group repeats a word", async () => {
  // The counterpart of the test above: with the conflict removed, the same
  // incomplete map has to fail on the missing answer. Question 18 is the LEAST
  // side of group 9.
  const answers = discAnswers();
  delete answers[groupAt(9).leastQuestionId];

  await assert.rejects(
    () => submitParticipantResult("demo-disc", answers),
    /Missing or invalid answer for DISC question 18\./,
  );
});

test("submits BFI and MBTI unchanged when one option value repeats throughout", async () => {
  // Neither declares groups or exclusivity, so answering every question with the
  // same option value is an ordinary response and submit must not object.
  for (const [access, testKey] of [
    ["demo-bfi", "bfi"],
    ["demo-mbti", "mbti"],
  ] as const) {
    const definition = getTestDefinition(testKey);
    const submitted = await submitParticipantResult(
      access,
      Object.fromEntries(
        definition.questions.map((question) => [
          question.id,
          question.options[0].value,
        ]),
      ),
    );

    assert.equal(submitted.persisted, false, testKey);
    assert.ok(submitted.score.summary, testKey);
  }
});

test("persists no draft for a demo run", async () => {
  // A demo access stores nothing, so a demo participant's autosave cannot leave a
  // draft behind for anyone to resume into.
  const group = groupAt(9);

  assert.equal(
    await saveParticipantAnswerDraft("demo-disc", {
      answers: { [group.mostQuestionId]: group.options[0].value },
      questionTimings: {},
      currentQuestionIndex: 16,
    }),
    null,
  );
});

test("refuses a demo draft that repeats a word, like a real one", async () => {
  // The demo path stores nothing, but it is how the grid is exercised without a
  // real assignment, and submit validates a demo run too. If draft save answered
  // 200 here, the demo would quietly accept the one state every other path
  // refuses - and a client-side regression would go unnoticed in exactly the
  // environment used to try the grid out.
  const group = groupAt(9);

  await assert.rejects(
    () =>
      saveParticipantAnswerDraft("demo-disc", {
        answers: {
          [group.mostQuestionId]: "C",
          [group.leastQuestionId]: "C",
        },
        questionTimings: {},
        currentQuestionIndex: 16,
      }),
    /^Error: Group 9 cannot use the same word for Most and Least\.$/,
  );
});

test("accepts a half-answered demo draft", async () => {
  // The counterpart: the gate must not turn a legitimately partial draft into an
  // error, or autosave would break on the first of the two answers.
  const group = groupAt(9);

  assert.equal(
    await saveParticipantAnswerDraft("demo-disc", {
      answers: { [group.leastQuestionId]: "C" },
      questionTimings: {},
      currentQuestionIndex: 16,
    }),
    null,
  );
});

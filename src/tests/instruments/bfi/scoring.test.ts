import assert from "node:assert/strict";
import test from "node:test";

import type { AnswerMap, ScoreOutput } from "@/tests/shared/types";

import { bfiQuestions } from "./questions";
import { isBfiScoreOutput } from "./result";
import { scoreBfiAnswers } from "./scoring";

function answersWith(value: string): AnswerMap {
  return Object.fromEntries(
    bfiQuestions.map((question) => [question.id, value]),
  );
}

test("registers 50 unique questions with 10 items per trait", () => {
  assert.equal(bfiQuestions.length, 50);
  assert.equal(new Set(bfiQuestions.map((question) => question.id)).size, 50);

  const counts = Object.groupBy(
    bfiQuestions,
    (question) => question.trait,
  );

  for (const traitQuestions of Object.values(counts)) {
    assert.equal(traitQuestions?.length, 10);
  }
});

test("uses complete, plain-English first-person statements", () => {
  for (const question of bfiQuestions) {
    assert.match(question.prompt, /^I\s/);
    assert.match(question.prompt, /\.$/);
  }

  const promptsById = Object.fromEntries(
    bfiQuestions.map((question) => [question.id, question.prompt]),
  );

  assert.equal(promptsById["1"], "I am the life of the party.");
  assert.equal(promptsById["19"], "I rarely feel sad.");
  assert.equal(promptsById["27"], "I am compassionate toward other people.");
  assert.equal(promptsById["38"], "I avoid my responsibilities.");
  assert.equal(promptsById["48"], "I have high standards for my work.");
});

test("scores neutral responses at the midpoint of every trait scale", () => {
  const score = scoreBfiAnswers(answersWith("3"));

  assert.equal(score.summary.label, "Balanced trait profile");

  for (const dimension of score.summary.dimensions) {
    assert.equal(dimension.rawScore, 30);
    assert.equal(dimension.average, 3);
    assert.equal(dimension.scorePercent, 50);
    assert.equal(dimension.band, "moderate");
  }

  const persistedScore = JSON.parse(JSON.stringify(score)) as ScoreOutput;
  assert.equal(isBfiScoreOutput(persistedScore), true);
});

test("applies the published positive and reverse scoring keys", () => {
  const score = scoreBfiAnswers(answersWith("5"));
  const rawScores = Object.fromEntries(
    score.summary.dimensions.map((dimension) => [
      dimension.key,
      dimension.rawScore,
    ]),
  );

  assert.deepEqual(rawScores, {
    extraversion: 30,
    agreeableness: 34,
    conscientiousness: 34,
    emotionalStability: 18,
    opennessIntellect: 38,
  });
});

test("can reach the maximum for every trait with keyed responses", () => {
  const answers = Object.fromEntries(
    bfiQuestions.map((question) => [question.id, question.reverse ? "1" : "5"]),
  );
  const score = scoreBfiAnswers(answers);

  for (const dimension of score.summary.dimensions) {
    assert.equal(dimension.rawScore, 50);
    assert.equal(dimension.average, 5);
    assert.equal(dimension.scorePercent, 100);
    assert.equal(dimension.band, "higher");
  }
});

test("rejects missing and invalid answer values", () => {
  const missing = answersWith("3");
  delete missing["17"];

  assert.throws(
    () => scoreBfiAnswers(missing),
    /Missing or invalid answer for Big Five question 17/,
  );

  const invalid = answersWith("3");
  invalid["8"] = "6";

  assert.throws(
    () => scoreBfiAnswers(invalid),
    /Missing or invalid answer for Big Five question 8/,
  );
});

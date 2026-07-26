import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  canPersistDraft,
  type DraftLoadState,
  mergeDraftAnswers,
  mergeDraftTimings,
  resumeScreenIndex,
} from "./draft-resume";

test("keeps an answer chosen before the stored draft arrived", () => {
  // The bug this pins: the participant answers the first screen while GET
  // /api/test/draft is still in flight, the response is assigned into state, and
  // their answer is gone with no error and nothing to retry.
  const merged = mergeDraftAnswers({ q2: "b", q3: "c" }, { q1: "a" });

  assert.deepEqual(merged, { q1: "a", q2: "b", q3: "c" });
});

test("prefers the local answer when both sides answered one question", () => {
  // The local value is both newer and the one currently drawn on screen, so the
  // stored value winning would contradict the radio the participant can see.
  assert.deepEqual(mergeDraftAnswers({ q1: "a" }, { q1: "d" }), { q1: "d" });
});

test("restores the stored answers when the session has answered nothing", () => {
  const loaded = { q1: "a", q2: "b" };

  assert.deepEqual(mergeDraftAnswers(loaded, {}), loaded);
  // A resume must not be able to mutate what the response handed it.
  assert.notEqual(mergeDraftAnswers(loaded, {}), loaded);
});

test("keeps local answers when there is no stored draft to merge", () => {
  assert.deepEqual(mergeDraftAnswers({}, { q1: "a" }), { q1: "a" });
  assert.deepEqual(mergeDraftAnswers({}, {}), {});
});

test("adds this session's seconds to the stored total for a question", () => {
  // A timing is total seconds across every visit, and `recordTiming` in the runner
  // already accumulates. Overwriting would discard one of the two visits.
  assert.deepEqual(
    mergeDraftTimings({ q1: 12, q2: 4 }, { q1: 3, q3: 7 }),
    { q1: 15, q2: 4, q3: 7 },
  );
});

test("carries a timing through when only one side has it", () => {
  assert.deepEqual(mergeDraftTimings({ q1: 9 }, {}), { q1: 9 });
  assert.deepEqual(mergeDraftTimings({}, { q1: 9 }), { q1: 9 });
  assert.deepEqual(mergeDraftTimings({}, {}), {});
});

test("restores the stored screen when the participant has not acted", () => {
  assert.equal(
    resumeScreenIndex({
      storedScreenIndex: 13,
      localScreenIndex: 0,
      hasLocalInteraction: false,
    }),
    13,
  );
});

test("stays on the screen the participant moved to before the draft resolved", () => {
  // Pulling them back would move the page under their hands - in grid mode, away
  // from the group they are half way through answering.
  assert.equal(
    resumeScreenIndex({
      storedScreenIndex: 13,
      localScreenIndex: 1,
      hasLocalInteraction: true,
    }),
    1,
  );
  // Including when they are still on the first screen, having answered it there.
  assert.equal(
    resumeScreenIndex({
      storedScreenIndex: 13,
      localScreenIndex: 0,
      hasLocalInteraction: true,
    }),
    0,
  );
});

test("wires the merge into the runner rather than assigning the draft", () => {
  // This repo has no DOM/component test harness, so the helpers above are pure and
  // this asserts against the one call site. Without it, the helpers could all pass
  // while the runner went on overwriting state - which is exactly the defect.
  const runner = readFileSync(
    path.join(
      process.cwd(),
      "src/components/test/participant-test-runner.tsx",
    ),
    "utf8",
  );

  for (const helper of [
    "mergeDraftAnswers",
    "mergeDraftTimings",
    "resumeScreenIndex",
  ]) {
    assert.match(
      runner,
      new RegExp(`\\b${helper}\\(`),
      `the runner must reconcile a loaded draft with ${helper}`,
    );
  }

  for (const wholesale of [
    "setAnswers(draft.answers)",
    "setQuestionTimings(draft.questionTimings)",
  ]) {
    assert.ok(
      !runner.includes(wholesale),
      `${wholesale} discards anything answered before the draft resolved`,
    );
  }

  // The deferred save is the other half: PUT replaces the whole stored map, so a
  // save sent before the merge would truncate the draft to this session's answers.
  assert.match(
    runner,
    /if \(!canPersistDraft\(draftLoadRef\.current\)\) \{\s*return;\s*\}/,
    "draft save must be held back until the stored draft has been merged in",
  );
  // And held back is not dropped - the merged map is saved once it exists, or a
  // participant who answered and closed the tab would still lose the answer.
  assert.match(
    runner,
    /queueDraftSaveRef\.current\(/,
    "the merged map must be persisted once the load resolves",
  );

  // The gate has exactly two writers, and which value each writes is the whole
  // point: the resolve path may open it, the failure path may not.
  assert.match(
    runner,
    /draftLoadRef\.current = "loaded";/,
    "a successful load must open the gate",
  );
  assert.match(
    runner,
    /draftLoadRef\.current = "failed";/,
    "a failed load must be recorded as failed, not as loaded",
  );
  assert.deepEqual(
    [...runner.matchAll(/draftLoadRef\.current = "([a-z]+)"/g)].map(
      (match) => match[1],
    ),
    ["loaded", "failed"],
    "nothing else may write the draft-load gate",
  );
});

test("holds the draft closed until the stored map is known", () => {
  // PUT /api/test/draft replaces the whole answer map, so a session that has not
  // read the stored one must not write it.
  assert.equal(canPersistDraft("pending"), false);
  assert.equal(canPersistDraft("loaded"), true);
});

test("keeps the draft closed after a FAILED read, not open", () => {
  // The defect this pins: treating a failed GET as "loaded" unblocked autosave,
  // and the next selection replaced a stored draft of twenty answers with the one
  // answer this session happened to hold. A failed read must not become lost data.
  assert.equal(canPersistDraft("failed"), false);

  // Stated exhaustively so a fourth state cannot be added silently and default to
  // savable.
  const savable: DraftLoadState[] = (
    ["pending", "loaded", "failed"] as DraftLoadState[]
  ).filter(canPersistDraft);

  assert.deepEqual(savable, ["loaded"]);
});

test("tells the participant that autosave is off after a failed read", () => {
  // Refusing to save is only safe if the participant knows. Otherwise they assume
  // their progress is being kept and close the tab.
  const runner = readFileSync(
    path.join(
      process.cwd(),
      "src/components/test/participant-test-runner.tsx",
    ),
    "utf8",
  );

  assert.match(
    runner,
    /Your progress will not be saved automatically/,
    "the failed-read message must say that autosave is off",
  );
  assert.match(
    runner,
    /any answers already stored are left as they are/,
    "the failed-read message must say the stored draft is untouched",
  );
});

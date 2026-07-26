"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Loader2,
  Send,
} from "lucide-react";

import {
  answerInstruction,
  forcedChoiceGroupInstruction,
} from "@/components/test/answer-instruction";
import { BfiParticipantResult } from "@/components/test/bfi-participant-result";
import { DiscParticipantResult } from "@/components/test/disc-participant-result";
import {
  canPersistDraft,
  type DraftLoadState,
  mergeDraftAnswers,
  mergeDraftTimings,
  resumeScreenIndex,
} from "@/components/test/draft-resume";
import {
  clampScreenIndex,
  forcedChoiceInputSource,
  groupProgressLabel,
  groupProgressOf,
  incompleteGroupsLabel,
  screenIndexFromStored,
  shouldAdvanceAfterGroupAnswer,
  storedIndexForScreen,
} from "@/components/test/forced-choice-screen";
import { ForcedChoiceGroupTable } from "@/components/test/forced-choice-group-table";
import { MbtiParticipantResult } from "@/components/test/mbti-participant-result";
import { ParticipantExperienceShell } from "@/components/test/participant-experience-shell";
import { isBfiScoreOutput } from "@/tests/instruments/bfi/result";
import { isDiscScoreOutput } from "@/tests/instruments/disc/result";
import {
  forcedChoiceConflictGroupList,
  forcedChoiceGroupConflicts,
} from "@/tests/shared/forced-choice";
import type {
  ForcedChoiceGroup,
  PublicTestQuestion,
  ScoreOutput,
  TestKey,
  TestPresentation,
} from "@/tests/shared/types";

interface PublicParticipantTest {
  key: TestKey;
  name: string;
  version: string;
  questions: PublicTestQuestion[];
  /**
   * Resolved by `src/app/test/page.tsx`, so it is never absent here:
   * `"single-question"` for every instrument that did not opt in.
   */
  presentation: TestPresentation;
  /** `[]` for a single-question instrument, one entry per screen otherwise. */
  forcedChoiceGroups: ForcedChoiceGroup[];
  /** `true` only when a group's two sides must not carry the same answer. */
  exclusiveWithinGroup: boolean;
}

interface ParticipantTestRunnerProps {
  organizationName: string;
  initialStatus: "active" | "in_progress";
  initialStartedAt: string | null;
  test: PublicParticipantTest;
}

type Answers = Record<string, string>;
type QuestionTimings = Record<string, number>;
type DraftStatus = "loading" | "idle" | "saving" | "saved" | "error";

interface SubmittedResult {
  score: {
    summary: {
      type?: string;
      counts?: Record<string, number>;
      dimensions?: {
        code: string;
        selected: string;
        left: string;
        right: string;
        leftScore: number;
        rightScore: number;
      }[];
    };
    result: {
      type?: string;
      name?: string;
      nameDescription?: string;
      epithet?: string;
      imagePath?: string;
      description?: string;
      generalTraits?: string[];
      strengths?: string[];
    };
    interpretation?: {
      relationshipStrengths?: string[];
      relationshipWeaknesses?: string[];
      successDefinition?: string;
      gifts?: string[];
      livingHappilyTips?: string;
    };
  };
  persisted: boolean;
  durationSeconds: number;
}

/** The two column instructions for a grid screen, single-sourced with the item. */
const forcedChoiceScreenInstruction = forcedChoiceGroupInstruction();

/**
 * The presented groups whose two sides carry the same option value, as group
 * numbers in ascending order.
 *
 * The rule itself comes from `@/tests/shared/forced-choice`, which is also what
 * draft save, submit, and result import call, so the client and the server cannot
 * drift on which groups block submission. That module takes the groups it should
 * judge rather than naming an instrument, which is what keeps the participant's
 * bundle clear of the item bank and its scoring keys.
 */
function conflictedGroupNumbers(
  groups: ForcedChoiceGroup[],
  answers: Answers,
): number[] {
  return forcedChoiceGroupConflicts(groups, answers).map(
    (conflict) => conflict.group,
  );
}

/**
 * What the participant is told when a group holds the same word on both sides.
 *
 * The first sentence mirrors `assertExclusiveWithinGroup` in
 * `src/services/participant-service.ts`, down to the shared group-list helper both
 * call. That module reaches the database so a client component cannot import it,
 * and the participant should read the same sentence whichever of the two gates
 * reports the group. The rest says what to do and admits the consequence, because
 * autosave is deliberately paused while the answer map would be rejected.
 */
function exclusivityConflictNotice(groupNumbers: number[]): string {
  const target = groupNumbers.length < 2 ? "that group" : "each group listed";

  return `${forcedChoiceConflictGroupList(
    groupNumbers,
  )} cannot use the same word for Most and Least. Reopen ${target} and change one of its two columns. Your answers are not saved until that is fixed.`;
}

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? [hours, minutes, seconds]
        .map((part) => part.toString().padStart(2, "0"))
        .join(":")
    : [minutes, seconds]
        .map((part) => part.toString().padStart(2, "0"))
        .join(":");
}

function UnavailableResult({
  detail,
  organizationName,
  testName,
}: {
  detail: string;
  organizationName: string;
  testName: string;
}) {
  return (
    <ParticipantExperienceShell
      organizationName={organizationName}
      testName={testName}
      status="completed"
      metaLabel="Results unavailable"
    >
      <section className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6 text-center shadow-[0_3px_14px_rgb(15_23_42/0.04)]">
        <h1 className="text-lg font-semibold text-slate-950">
          The result could not be displayed
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      </section>
    </ParticipantExperienceShell>
  );
}

function QuestionGrid({
  answers,
  currentIndex,
  density = "compact",
  onSelect,
  questions,
}: {
  answers: Answers;
  currentIndex: number;
  density?: "compact" | "comfortable";
  onSelect: (index: number) => void;
  questions: PublicTestQuestion[];
}) {
  const isComfortable = density === "comfortable";

  return (
    <div
      className={`grid ${
        isComfortable ? "grid-cols-7 gap-1.5" : "grid-cols-10 gap-1"
      }`}
    >
      {questions.map((mappedQuestion, index) => {
        const answered = Boolean(answers[mappedQuestion.id]);
        const current = index === currentIndex;

        return (
          <button
            key={mappedQuestion.id}
            type="button"
            onClick={() => onSelect(index)}
            className={`aspect-square border font-medium transition ${
              isComfortable ? "rounded-md text-[9px]" : "rounded text-[8px]"
            } ${
              current
                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                : answered
                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600"
            }`}
            aria-label={`Go to question ${mappedQuestion.no}`}
            aria-current={current ? "step" : undefined}
          >
            {mappedQuestion.no}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The map for a forced-choice instrument: one cell per group, not one per
 * question, because a group is what the participant navigates.
 *
 * A partly answered group carries three independent signals - a dashed border, a
 * corner dot, and its state spelled out in the cell's accessible name - so it
 * can never be mistaken for a finished one, including while it is the current
 * cell, and including for a participant who cannot distinguish the amber fill
 * from the cyan one.
 */
function GroupGrid({
  answers,
  currentIndex,
  density = "compact",
  groups,
  onSelect,
}: {
  answers: Answers;
  currentIndex: number;
  density?: "compact" | "comfortable";
  groups: ForcedChoiceGroup[];
  onSelect: (index: number) => void;
}) {
  const isComfortable = density === "comfortable";

  return (
    <div
      className={`grid ${
        isComfortable ? "grid-cols-7 gap-1.5" : "grid-cols-10 gap-1"
      }`}
    >
      {groups.map((group, index) => {
        const progress = groupProgressOf(answers, group);
        const current = index === currentIndex;
        const tone = current
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : progress === "complete"
            ? "border-cyan-200 bg-cyan-50 text-cyan-700"
            : progress === "partial"
              ? "border-dashed border-orange-400 bg-orange-50 text-orange-800"
              : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600";
        const partialMark =
          progress === "partial"
            ? `after:absolute after:right-px after:top-px after:size-1 after:rounded-full after:content-[''] ${
                current ? "after:bg-white" : "after:bg-orange-600"
              }`
            : "";

        return (
          <button
            key={group.mostQuestionId}
            type="button"
            onClick={() => onSelect(index)}
            className={`relative aspect-square border font-medium transition ${
              isComfortable ? "rounded-md text-[9px]" : "rounded text-[8px]"
            } ${tone} ${partialMark}`}
            aria-label={`Go to group ${group.group}, ${groupProgressLabel[progress]}`}
            aria-current={current ? "step" : undefined}
          >
            {group.group}
          </button>
        );
      })}
    </div>
  );
}

export function ParticipantTestRunner({
  organizationName,
  initialStatus,
  initialStartedAt,
  test,
}: ParticipantTestRunnerProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [questionTimings, setQuestionTimings] = useState<QuestionTimings>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] =
    useState<SubmittedResult | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const advanceTimeoutRef = useRef<number | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);
  const questionStartedAtRef = useRef(0);
  // The timeStamp of the most recent grid selection. `ForcedChoiceGroupTable`
  // reports only a question id and a value, so the wrapper around it records the
  // event on the way down and the handler reads it from here. Same source as the
  // single-question path, which takes `event.timeStamp` from its click, and the
  // same clock as `performance.now()`.
  const gridAnsweredAtRef = useRef(0);
  // The timeStamp of the most recent pointer press inside the grid, which is what
  // separates a deliberate tap or click from the arrow-key navigation that checks
  // radios as it passes them. See `forcedChoiceInputSource`.
  const gridPointerDownAtRef = useRef(0);
  const gridRef = useRef<HTMLDivElement | null>(null);
  // Set only when the screen advanced on its own. A deliberate Previous/Next press
  // leaves focus on the button that was pressed, which is where the participant
  // expects it; an automatic advance has no such anchor, and the radio that
  // triggered it is unmounted with the group it belonged to.
  const pendingGridFocusRef = useRef(false);
  const mobileQuestionMapRef = useRef<HTMLDetailsElement | null>(null);
  // How GET /api/test/draft turned out. A ref rather than state because the load
  // handler and every save have to agree about it at the moment they run: nothing
  // renders from it, and a state value read inside a promise callback is the one
  // captured when the request was made.
  //
  // Three states, because "failed" must not behave like "loaded" - see
  // `canPersistDraft`, which owns that distinction.
  const draftLoadRef = useRef<DraftLoadState>("pending");
  /**
   * What the participant did BEFORE the stored draft arrived.
   *
   * The first screen is interactive from mount, so answering before the response
   * comes back is ordinary rather than exotic - and in grid mode a participant can
   * fill both columns and be carried to the next group in that window. This holds
   * exactly what the deferred save needs, because the two are the same thing: the
   * answers and timings chosen so far, and the screen they belong to.
   */
  const preDraftWorkRef = useRef<{
    interacted: boolean;
    answers: Answers;
    questionTimings: QuestionTimings;
    screenIndex: number;
  }>({ interacted: false, answers: {}, questionTimings: {}, screenIndex: 0 });

  const groups = test.forcedChoiceGroups;
  // Guarded on the group list as well as the presentation string, so a
  // half-configured definition falls back to the single-question runner instead
  // of rendering an empty screen.
  const isGridMode =
    test.presentation === "forced-choice-grid" && groups.length > 0;
  // One screen per group in grid mode, one per question otherwise. Every index
  // held in `currentIndex`, passed to the map, or clamped below is a SCREEN
  // index; only the draft payload speaks question indexes.
  const screenCount = isGridMode ? groups.length : test.questions.length;
  const question = test.questions[currentIndex];
  const currentGroup = isGridMode ? groups[currentIndex] : undefined;

  useEffect(() => {
    if (!submittedResult) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;

      root.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      root.style.scrollBehavior = previousScrollBehavior;
      document
        .querySelector<HTMLElement>("[data-participant-result-heading]")
        ?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [submittedResult]);
  const answeredCount = Object.keys(answers).length;
  const completedGroupCount = useMemo(() => {
    if (!isGridMode) {
      return 0;
    }

    return groups.filter(
      (group) => groupProgressOf(answers, group) === "complete",
    ).length;
  }, [answers, groups, isGridMode]);
  // Progress and the map counter measure finished screens. In grid mode a group
  // only counts once BOTH columns are answered, so 56 raw answers never inflate
  // the bar and a half-filled group is never counted as done.
  const completedCount = isGridMode ? completedGroupCount : answeredCount;
  const isComplete = completedCount === screenCount;
  const progress = (completedCount / screenCount) * 100;

  const conflictsFor = useCallback(
    (candidate: Answers) =>
      test.exclusiveWithinGroup
        ? conflictedGroupNumbers(groups, candidate)
        : [],
    [groups, test.exclusiveWithinGroup],
  );
  const conflictGroupNumbers = useMemo(
    () => conflictsFor(answers),
    [answers, conflictsFor],
  );
  // The grid cannot produce this state, so it only ever comes from a draft or a
  // result stored before the rule existed. It is reported rather than silently
  // repaired: the participant decides which of their two answers changes.
  const conflictNotice = conflictGroupNumbers.length
    ? exclusivityConflictNotice(conflictGroupNumbers)
    : null;
  const notice = error ?? conflictNotice;

  useEffect(() => {
    const persistedStartedAt = initialStartedAt
      ? new Date(initialStartedAt).getTime()
      : Number.NaN;

    timerStartedAtRef.current = Number.isFinite(persistedStartedAt)
      ? persistedStartedAt
      : Date.now();

    const tick = () => {
      const startedAt = timerStartedAtRef.current ?? Date.now();
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [initialStartedAt]);

  useEffect(() => {
    questionStartedAtRef.current = performance.now();
  }, [currentIndex]);

  /**
   * Puts focus back inside the grid after an automatic advance.
   *
   * Without this, focus is on nothing: the radio that completed the previous group
   * is unmounted with it, so `document.activeElement` falls back to `<body>` and a
   * keyboard user is 29 Tab presses from the table while a screen-reader user is
   * told nothing at all. The Most column of the new group is where answering
   * starts, and preferring an already checked radio means revisiting an answered
   * group lands on the answer rather than on the first row.
   */
  useEffect(() => {
    if (!pendingGridFocusRef.current) {
      return;
    }

    pendingGridFocusRef.current = false;

    const container = gridRef.current;

    if (!container) {
      return;
    }

    const target =
      container.querySelector<HTMLInputElement>(
        'input[type="radio"]:checked:not(:disabled)',
      ) ??
      container.querySelector<HTMLInputElement>(
        'input[type="radio"]:not(:disabled)',
      );

    target?.focus();
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current !== null) {
        window.clearTimeout(advanceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (initialStatus !== "active") {
      return;
    }

    const controller = new AbortController();

    fetch("/api/test/start", {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "Unable to start the assessment.");
        }

        return response.json();
      })
      .then((body) => {
        const startedAt = new Date(body.startedAt).getTime();
        if (Number.isFinite(startedAt)) {
          timerStartedAtRef.current = startedAt;
        }
      })
      .catch((startError) => {
        if (!controller.signal.aborted) {
          setError(
            startError instanceof Error
              ? startError.message
              : "Unable to start the assessment.",
          );
        }
      });

    return () => controller.abort();
  }, [initialStatus]);

  const persistDraft = useCallback(
    async (
      nextAnswers: Answers,
      nextQuestionTimings: QuestionTimings,
      nextScreenIndex: number,
    ) => {
      if (submittedResult || !Object.keys(nextAnswers).length) {
        return;
      }

      setDraftStatus("saving");

      const response = await fetch("/api/test/draft", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: nextAnswers,
          questionTimings: nextQuestionTimings,
          currentQuestionIndex: storedIndexForScreen(
            nextScreenIndex,
            isGridMode,
          ),
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to save draft answers.");
      }

      setDraftStatus("saved");
    },
    [isGridMode, submittedResult],
  );

  const queueDraftSave = useCallback(
    (
      nextAnswers: Answers,
      nextQuestionTimings: QuestionTimings,
      nextScreenIndex: number,
    ) => {
      // Nothing may be persisted until the stored draft has been merged in. PUT
      // /api/test/draft replaces the whole answer map, so a request sent from a
      // state that does not yet include the stored answers would truncate the
      // draft to whatever this session has answered so far. While the read is
      // still in flight the answer is not dropped: `preDraftWorkRef` holds it, and
      // the load handler saves the merged map as soon as it has one. After a
      // FAILED read there is no merged map to wait for, so this stays shut for the
      // rest of the session rather than writing over answers it never saw.
      if (!canPersistDraft(draftLoadRef.current)) {
        return;
      }

      // PUT /api/test/draft rejects an answer map that marks one word both Most
      // and Least, by design, and it rejects the whole map rather than the one
      // group. Sending it would guarantee a failed request and a save error the
      // participant cannot clear, so autosave pauses while a conflict exists and
      // the on-screen notice says so. Judged from the OUTGOING answers, so the
      // selection that resolves a conflict is saved immediately.
      if (conflictsFor(nextAnswers).length) {
        return;
      }

      setDraftStatus("saving");
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() =>
          persistDraft(nextAnswers, nextQuestionTimings, nextScreenIndex),
        )
        .catch((draftError) => {
          setDraftStatus("error");
          setError(
            draftError instanceof Error
              ? draftError.message
              : "Unable to save draft answers.",
          );
        });
    },
    [conflictsFor, persistDraft],
  );

  /**
   * The current save queue, reachable from the draft-load handler below.
   *
   * That handler has to persist the merged answer map, but the effect it lives in
   * is keyed on the presentation alone: taking `queueDraftSave` as a dependency
   * would refetch the draft - and overwrite state - every time the callback is
   * rebuilt. Mirroring it here keeps that dependency list honest without the
   * handler closing over a stale copy.
   */
  const queueDraftSaveRef = useRef(queueDraftSave);

  useEffect(() => {
    queueDraftSaveRef.current = queueDraftSave;
  }, [queueDraftSave]);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/test/draft", {
      method: "GET",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to load draft answers.");
        }

        return body.draft as {
          answers: Answers;
          questionTimings: QuestionTimings;
          currentQuestionIndex: number;
          updatedAt: string;
        } | null;
      })
      .then((draft) => {
        // MERGED, not assigned. The first screen is interactive from mount, so the
        // participant may already have answered it - or, in grid mode, filled both
        // columns and been carried to the next group - while this request was in
        // flight. Assigning the response over the top unchecked the radio they had
        // just pressed, with no error and nothing to retry. `draft-resume.ts` holds
        // which side wins for each of the three, and why.
        const preDraftWork = preDraftWorkRef.current;
        const nextAnswers = draft
          ? mergeDraftAnswers(draft.answers, preDraftWork.answers)
          : preDraftWork.answers;
        const nextQuestionTimings = draft
          ? mergeDraftTimings(draft.questionTimings, preDraftWork.questionTimings)
          : preDraftWork.questionTimings;
        const nextScreenIndex = draft
          ? resumeScreenIndex({
              storedScreenIndex: clampScreenIndex(
                screenIndexFromStored(draft.currentQuestionIndex, isGridMode),
                screenCount,
              ),
              localScreenIndex: preDraftWork.screenIndex,
              hasLocalInteraction: preDraftWork.interacted,
            })
          : preDraftWork.screenIndex;

        if (draft) {
          setAnswers(nextAnswers);
          setQuestionTimings(nextQuestionTimings);
          setCurrentIndex(nextScreenIndex);
          setDraftStatus("saved");
        } else {
          // Nothing stored, so state already holds everything there is - whatever
          // this session has answered so far, which is what `nextAnswers` is.
          setDraftStatus("idle");
        }

        draftLoadRef.current = "loaded";

        // Saves are held back until this point, because PUT replaces the whole
        // stored answer map and one sent before the merge would truncate the draft
        // to this session's answers. Now that the merged map exists, anything
        // answered while the request was in flight is persisted - otherwise a
        // participant who answered and then closed the tab would lose it.
        if (Object.keys(preDraftWork.answers).length) {
          queueDraftSaveRef.current(
            nextAnswers,
            nextQuestionTimings,
            nextScreenIndex,
          );
        }
      })
      .catch((draftError) => {
        if (!controller.signal.aborted) {
          setDraftStatus("error");
          draftLoadRef.current = "failed";
          // "failed", not "loaded", so `canPersistDraft` keeps autosave shut.
          //
          // PUT /api/test/draft replaces the stored answer map wholesale. After a
          // failed READ this session never learned what that map holds, so the
          // first autosave would replace a draft of, say, twenty answers with the
          // one answer given since the failure - a failed read turned into lost
          // data, which is the exact truncation this guard exists to prevent.
          // Leaving the stored draft untouched instead means a reload once the
          // error clears still finds it.
          //
          // The cost is that this session is not autosaved, and the participant is
          // told so rather than left to assume it is. Submitting still works and
          // still carries everything: the questionnaire cannot be submitted until
          // every question is answered, and submit sends the whole map in state.
          setError(
            `${
              draftError instanceof Error
                ? draftError.message
                : "Unable to load draft answers."
            } Your progress will not be saved automatically while this error is on screen, and any answers already stored are left as they are. Reload the page to try again, or answer the questions and submit in this sitting.`,
          );
        }
      });

    return () => controller.abort();
  }, [isGridMode, screenCount]);

  const canGoBack = currentIndex > 0;

  function recordTiming(questionId: string, answeredAt: number) {
    const questionElapsedSeconds = questionStartedAtRef.current
      ? Math.max(
          1,
          Math.floor((answeredAt - questionStartedAtRef.current) / 1000),
        )
      : 1;

    return {
      ...questionTimings,
      [questionId]: (questionTimings[questionId] ?? 0) + questionElapsedSeconds,
    };
  }

  /**
   * Remembers what the participant has done while GET /api/test/draft is still in
   * flight, and does nothing once it has settled.
   *
   * Two things depend on it: the merge, which needs the answers that state holds
   * but the load handler's closure cannot see, and the deferred save, whose payload
   * this is. A screen index is recorded as well, so a participant who moved before
   * the stored position arrived is not pulled back to where an earlier session left
   * off.
   */
  function recordPreDraftWork(
    nextAnswers: Answers,
    nextQuestionTimings: QuestionTimings,
    nextScreenIndex: number,
  ) {
    if (draftLoadRef.current === "loaded") {
      return;
    }

    preDraftWorkRef.current = {
      interacted: true,
      answers: nextAnswers,
      questionTimings: nextQuestionTimings,
      screenIndex: nextScreenIndex,
    };
  }

  function selectAnswer(questionId: string, value: string, answeredAt: number) {
    if (isAdvancing || isSubmitting) {
      return;
    }

    const nextAnswers = {
      ...answers,
      [questionId]: value,
    };
    const nextQuestionTimings = recordTiming(questionId, answeredAt);
    const lastIndex = test.questions.length - 1;
    const nextIndex = Math.min(currentIndex + 1, lastIndex);

    setAnswers(nextAnswers);
    setQuestionTimings(nextQuestionTimings);
    setError(null);
    recordPreDraftWork(nextAnswers, nextQuestionTimings, nextIndex);
    queueDraftSave(nextAnswers, nextQuestionTimings, nextIndex);

    if (currentIndex < lastIndex) {
      setIsAdvancing(true);
      advanceTimeoutRef.current = window.setTimeout(() => {
        setCurrentIndex(nextIndex);
        setIsAdvancing(false);
        advanceTimeoutRef.current = null;
      }, 170);
    }
  }

  /**
   * One column of one grid screen. Writes the same flat answer map a
   * single-question screen writes - one question id, one option value.
   *
   * The screen advances only when a POINTER commit is the one that COMPLETES the
   * group, and only when there is a next group. Each condition earns its place:
   * - the first of the two answers must leave the participant where they are;
   * - changing an answer in an already complete group must not throw them
   *   forward;
   * - a keyboard commit must never advance at all, because native radios are
   *   checked by the arrow keys as focus moves onto them, so a keyboard user
   *   walking down a column commits every word they pass. Advancing on that would
   *   record a word they were only navigating past and take the group away before
   *   they reached the one they wanted. They move on with Next instead.
   *
   * `shouldAdvanceAfterGroupAnswer` holds the decision so it can be tested
   * directly; this function only supplies the four facts it needs.
   */
  function selectGroupAnswer(
    group: ForcedChoiceGroup,
    questionId: string,
    value: string,
  ) {
    if (isAdvancing || isSubmitting) {
      return;
    }

    // Clamped to the screen's own start so a selection made without a captured
    // event - keyboard activation that somehow bypassed the wrapper, or a stale
    // ref - is charged the one-second minimum instead of a nonsense duration.
    const answeredAt = Math.max(
      gridAnsweredAtRef.current,
      questionStartedAtRef.current,
    );
    const nextAnswers = {
      ...answers,
      [questionId]: value,
    };
    const nextQuestionTimings = recordTiming(questionId, answeredAt);
    // Two question ids share one screen, so the clock restarts at each
    // selection. Each side is then charged for the stretch actually spent on it
    // instead of both being charged for the whole screen.
    questionStartedAtRef.current = answeredAt;

    const shouldAdvance = shouldAdvanceAfterGroupAnswer({
      source: forcedChoiceInputSource(
        gridAnsweredAtRef.current,
        gridPointerDownAtRef.current,
      ),
      wasComplete: groupProgressOf(answers, group) === "complete",
      isComplete: groupProgressOf(nextAnswers, group) === "complete",
      screenIndex: currentIndex,
      screenCount,
    });
    const nextIndex = shouldAdvance ? currentIndex + 1 : currentIndex;

    setAnswers(nextAnswers);
    setQuestionTimings(nextQuestionTimings);
    setError(null);
    recordPreDraftWork(nextAnswers, nextQuestionTimings, nextIndex);
    queueDraftSave(nextAnswers, nextQuestionTimings, nextIndex);

    if (shouldAdvance) {
      setIsAdvancing(true);
      advanceTimeoutRef.current = window.setTimeout(() => {
        pendingGridFocusRef.current = true;
        setCurrentIndex(nextIndex);
        setIsAdvancing(false);
        advanceTimeoutRef.current = null;
      }, 170);
    }
  }

  function goToScreen(index: number) {
    const nextIndex = clampScreenIndex(index, screenCount);

    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
      setIsAdvancing(false);
    }

    // A deliberate move keeps focus on the control that was used, so a pending
    // automatic focus from a cancelled advance must not fire on arrival.
    pendingGridFocusRef.current = false;

    // A move made before the stored position arrives is the participant's own
    // choice of screen, so it is recorded and the load leaves them on it rather
    // than pulling them back to where an earlier session stopped.
    recordPreDraftWork(answers, questionTimings, nextIndex);

    if (canPersistDraft(draftLoadRef.current) && Object.keys(answers).length) {
      queueDraftSave(answers, questionTimings, nextIndex);
    }

    setCurrentIndex(nextIndex);
    mobileQuestionMapRef.current?.removeAttribute("open");
  }

  async function submitAnswers() {
    // Named before the completeness check: an answer set can be complete and
    // still contradictory, and "all questions must be answered" would send the
    // participant looking for a gap that is not there.
    if (conflictNotice) {
      setError(conflictNotice);
      return;
    }

    if (!isComplete || isSubmitting || draftStatus === "saving") {
      setError(
        draftStatus === "saving"
          ? "Please wait for your final answer to save."
          : isGridMode
            ? "Both columns must be answered in every group before submission."
            : "All questions must be answered before submission.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/test/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers, questionTimings }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to submit assessment.");
      }

      setDraftStatus("idle");
      setSubmittedResult(body);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit assessment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedResult && test.key === "bfi") {
    const score = submittedResult.score as ScoreOutput;

    if (isBfiScoreOutput(score)) {
      return (
        <BfiParticipantResult
          durationSeconds={submittedResult.durationSeconds}
          organizationName={organizationName}
          score={score}
          testName={test.name}
        />
      );
    }

    return (
      <UnavailableResult
        detail="Your submission was received, but its Big Five result data did not match the expected instrument version. Contact the assessment administrator for support."
        organizationName={organizationName}
        testName={test.name}
      />
    );
  }

  if (submittedResult && test.key === "disc") {
    const score = submittedResult.score as ScoreOutput;

    if (isDiscScoreOutput(score)) {
      return (
        <DiscParticipantResult
          durationSeconds={submittedResult.durationSeconds}
          organizationName={organizationName}
          score={score}
          testName={test.name}
        />
      );
    }

    return (
      <UnavailableResult
        detail="Your submission was received, but its DISC result data did not match the expected instrument version. Contact the assessment administrator for support."
        organizationName={organizationName}
        testName={test.name}
      />
    );
  }

  if (submittedResult) {
    return (
      <MbtiParticipantResult
        dimensions={submittedResult.score.summary.dimensions ?? []}
        durationSeconds={submittedResult.durationSeconds}
        interpretation={submittedResult.score.interpretation}
        organizationName={organizationName}
        profile={submittedResult.score.result}
        summaryType={submittedResult.score.summary.type}
        testName={test.name}
      />
    );
  }

  return (
    <ParticipantExperienceShell
      organizationName={organizationName}
      testName={test.name}
      status="in_progress"
      metaLabel={formatElapsed(elapsedSeconds)}
    >
      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
          <section className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_14px_rgb(15_23_42/0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[11px] font-semibold text-slate-900">
                {isGridMode ? "Group map" : "Question map"}
              </h2>
              <span className="text-[9px] text-slate-400">
                {isGridMode
                  ? `${completedCount} of ${screenCount} complete`
                  : `${answeredCount} answered`}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2.5 text-[8px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-600" /> Current
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-cyan-400" />{" "}
                {isGridMode ? "Complete" : "Answered"}
              </span>
              {isGridMode ? (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-orange-500" /> One
                  column left
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              {isGridMode ? (
                <GroupGrid
                  answers={answers}
                  currentIndex={currentIndex}
                  density="comfortable"
                  groups={groups}
                  onSelect={goToScreen}
                />
              ) : (
                <QuestionGrid
                  answers={answers}
                  currentIndex={currentIndex}
                  density="comfortable"
                  onSelect={goToScreen}
                  questions={test.questions}
                />
              )}
            </div>
          </section>
        </aside>

        <details
          ref={mobileQuestionMapRef}
          className="group rounded-xl border border-slate-200/90 bg-white shadow-[0_3px_14px_rgb(15_23_42/0.04)] lg:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <BarChart3 size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-900">
                  {isGridMode ? "Group map" : "Question map"}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {isGridMode
                    ? `${completedCount} of ${screenCount} groups complete`
                    : `${answeredCount} of ${test.questions.length} answered`}
                </p>
              </div>
            </div>
            <ChevronDown
              className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
              size={16}
            />
          </summary>
          <div className="border-t border-slate-100 px-4 pb-4 pt-3">
            <div className="mb-3 flex flex-wrap gap-3 text-[8px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-600" /> Current
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-cyan-400" />{" "}
                {isGridMode ? "Complete" : "Answered"}
              </span>
              {isGridMode ? (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-orange-500" /> One
                  column left
                </span>
              ) : null}
            </div>
            {isGridMode ? (
              <GroupGrid
                answers={answers}
                currentIndex={currentIndex}
                groups={groups}
                onSelect={goToScreen}
              />
            ) : (
              <QuestionGrid
                answers={answers}
                currentIndex={currentIndex}
                onSelect={goToScreen}
                questions={test.questions}
              />
            )}
          </div>
        </details>

        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 border-t-4 border-t-orange-400 bg-white shadow-[0_3px_14px_rgb(15_23_42/0.04)]">
          <div className="p-5 sm:p-7">
            <p className="flex items-start gap-2 text-sm font-semibold leading-5 text-orange-800">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-orange-500"
              />
              <span className="break-words">{test.name}</span>
            </p>
            <div className="mt-4 flex items-center justify-between gap-4 text-sm font-medium">
              <p className="text-slate-600">
                {currentGroup
                  ? `Group ${currentGroup.group} of ${screenCount}`
                  : `Question ${question.no} of ${test.questions.length}`}
              </p>
              <span className="text-blue-600">{Math.round(progress)}%</span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Assessment progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <h1 className="mt-3 text-[25px] font-semibold tracking-[-0.035em] text-slate-950 sm:text-[28px]">
              {currentGroup
                ? "Which word is most like you, and which is least?"
                : question.prompt}
            </h1>
            {currentGroup ? (
              <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600">
                <Lightbulb
                  aria-hidden="true"
                  className="mt-1 shrink-0 text-blue-500"
                  size={16}
                />
                <span>{forcedChoiceScreenInstruction}</span>
              </div>
            ) : (
              /* Byte for byte the row BFI and MBTI have always rendered: the
                 single-question path may not shift, and the only change here is
                 that the sentence now comes from the shared helper instead of
                 being typed inline. */
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                <Lightbulb className="text-blue-500" size={15} />
                {answerInstruction(question)}
              </div>
            )}
          </div>

          {currentGroup ? (
            <div
              className="px-5 sm:px-7"
              ref={gridRef}
              // Both in the capture phase, so the timestamps are recorded before
              // the radio's own change handler calls `onSelect`. `onChange` rather
              // than `onClick` for the answer itself, because a radio is also
              // activated from the keyboard; the pointer press is what tells the
              // two apart, and only a pointer commit may advance the screen.
              onPointerDownCapture={(event) => {
                gridPointerDownAtRef.current = event.timeStamp;
              }}
              onChangeCapture={(event) => {
                gridAnsweredAtRef.current = event.timeStamp;
              }}
            >
              {/* Keyed on the group, so each screen gets a fresh table rather
                  than the previous group's radios with new names. */}
              <ForcedChoiceGroupTable
                key={currentGroup.mostQuestionId}
                group={currentGroup}
                mostValue={answers[currentGroup.mostQuestionId]}
                leastValue={answers[currentGroup.leastQuestionId]}
                disabled={isSubmitting}
                // Only while the conflict is the notice actually on screen. A save
                // or submit error takes that one slot, and handing the table's
                // warning over to a message that is not being shown would leave the
                // contradiction with no visible explanation at all.
                conflictReportedElsewhere={
                  Boolean(conflictNotice) && notice === conflictNotice
                }
                onSelect={(questionId, value) =>
                  selectGroupAnswer(currentGroup, questionId, value)
                }
              />
              {/* The group changes without any focus change when the participant
                  uses Previous or Next, so the new position has to be announced.
                  Only the position: it changes exactly once per screen, whereas a
                  live region that also tracked the answers would speak over every
                  selection the participant makes. Grid mode only - the
                  single-question path is untouched. */}
              <p aria-live="polite" className="sr-only">
                {currentGroup.label}
              </p>
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label={`Answer for question ${question.no}`}
              className="space-y-3 px-5 sm:px-7"
            >
              {question.options.map((option) => {
                const isSelected = answers[question.id] === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isAdvancing || isSubmitting}
                    onClick={(event) =>
                      selectAnswer(question.id, option.value, event.timeStamp)
                    }
                    className={`group flex min-h-16 w-full items-center gap-4 rounded-xl border p-4 text-left transition duration-150 disabled:cursor-wait ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/80 shadow-[0_0_0_2px_rgb(59_130_246/0.08)]"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                    }`}
                  >
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                        isSelected
                          ? "border-blue-600"
                          : "border-slate-300 group-hover:border-blue-400"
                      }`}
                    >
                      {isSelected ? (
                        <span className="size-2.5 rounded-full bg-blue-600" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-medium leading-5 text-slate-700">
                      {option.label}
                    </span>
                    <ChevronRight
                      size={16}
                      className={`shrink-0 transition ${
                        isSelected
                          ? "translate-x-0 text-blue-600"
                          : "-translate-x-1 text-slate-300 group-hover:translate-x-0 group-hover:text-blue-500"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}

          {isGridMode ? (
            notice ? (
              <p
                role="alert"
                className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800 sm:mx-7"
              >
                {notice}
              </p>
            ) : null
          ) : error ? (
            <p className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:mx-7">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 sm:px-7">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => goToScreen(currentIndex - 1)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {/* Grid mode needs an explicit forward control: the screen advances
                on its own only when a group BECOMES complete, so revisiting a
                finished group, or leaving one deliberately unfinished, would
                otherwise have no way onward but the group map. */}
            {isGridMode && currentIndex < screenCount - 1 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => goToScreen(currentIndex + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-medium text-blue-700 shadow-sm hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : null}

            {currentIndex === screenCount - 1 ? (
              <div className="flex flex-wrap items-center gap-3">
                {!isComplete ? (
                  isGridMode ? (
                    <p className="text-sm text-slate-600">
                      {incompleteGroupsLabel(screenCount - completedCount)}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      {test.questions.length - answeredCount} unanswered
                    </p>
                  )
                ) : null}
                <button
                  type="button"
                  disabled={
                    !isComplete ||
                    isSubmitting ||
                    draftStatus === "saving" ||
                    conflictGroupNumbers.length > 0
                  }
                  onClick={submitAnswers}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-[0_5px_14px_rgb(37_99_235/0.2)] hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting || draftStatus === "saving" ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={15} />
                  )}
                  {draftStatus === "saving" ? "Saving" : "Submit assessment"}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </ParticipantExperienceShell>
  );
}

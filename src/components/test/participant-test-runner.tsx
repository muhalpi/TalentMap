"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Loader2,
  Send,
} from "lucide-react";

import { BfiParticipantResult } from "@/components/test/bfi-participant-result";
import { MbtiParticipantResult } from "@/components/test/mbti-participant-result";
import { ParticipantExperienceShell } from "@/components/test/participant-experience-shell";
import { isBfiScoreOutput } from "@/tests/instruments/bfi/result";
import type {
  PublicTestQuestion,
  ScoreOutput,
  TestKey,
} from "@/tests/shared/types";

interface PublicParticipantTest {
  key: TestKey;
  name: string;
  version: string;
  questions: PublicTestQuestion[];
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
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] =
    useState<SubmittedResult | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const advanceTimeoutRef = useRef<number | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);
  const questionStartedAtRef = useRef(0);
  const mobileQuestionMapRef = useRef<HTMLDetailsElement | null>(null);

  const question = test.questions[currentIndex];

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
  const isComplete = answeredCount === test.questions.length;
  const progress = (answeredCount / test.questions.length) * 100;

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
      nextQuestionIndex: number,
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
          currentQuestionIndex: nextQuestionIndex,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to save draft answers.");
      }

      setDraftStatus("saved");
    },
    [submittedResult],
  );

  const queueDraftSave = useCallback(
    (
      nextAnswers: Answers,
      nextQuestionTimings: QuestionTimings,
      nextQuestionIndex: number,
    ) => {
      setDraftStatus("saving");
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() =>
          persistDraft(nextAnswers, nextQuestionTimings, nextQuestionIndex),
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
    [persistDraft],
  );

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
        if (draft) {
          setAnswers(draft.answers);
          setQuestionTimings(draft.questionTimings);
          setCurrentIndex(
            Math.min(
              Math.max(draft.currentQuestionIndex, 0),
              test.questions.length - 1,
            ),
          );
          setDraftStatus("saved");
        } else {
          setDraftStatus("idle");
        }

        setHasLoadedDraft(true);
      })
      .catch((draftError) => {
        if (!controller.signal.aborted) {
          setDraftStatus("error");
          setHasLoadedDraft(true);
          setError(
            draftError instanceof Error
              ? draftError.message
              : "Unable to load draft answers.",
          );
        }
      });

    return () => controller.abort();
  }, [test.questions.length]);

  const canGoBack = currentIndex > 0;

  function selectAnswer(questionId: string, value: string, answeredAt: number) {
    if (isAdvancing || isSubmitting) {
      return;
    }

    const nextAnswers = {
      ...answers,
      [questionId]: value,
    };
    const questionElapsedSeconds = questionStartedAtRef.current
      ? Math.max(
          1,
          Math.floor((answeredAt - questionStartedAtRef.current) / 1000),
        )
      : 1;
    const nextQuestionTimings = {
      ...questionTimings,
      [questionId]: (questionTimings[questionId] ?? 0) + questionElapsedSeconds,
    };
    const lastIndex = test.questions.length - 1;
    const nextIndex = Math.min(currentIndex + 1, lastIndex);

    setAnswers(nextAnswers);
    setQuestionTimings(nextQuestionTimings);
    setError(null);
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

  function goToQuestion(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), test.questions.length - 1);

    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
      setIsAdvancing(false);
    }

    if (hasLoadedDraft && Object.keys(answers).length) {
      queueDraftSave(answers, questionTimings, nextIndex);
    }

    setCurrentIndex(nextIndex);
    mobileQuestionMapRef.current?.removeAttribute("open");
  }

  async function submitAnswers() {
    if (!isComplete || isSubmitting || draftStatus === "saving") {
      setError(
        draftStatus === "saving"
          ? "Please wait for your final answer to save."
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
      <ParticipantExperienceShell
        organizationName={organizationName}
        testName={test.name}
        status="completed"
        metaLabel="Results unavailable"
      >
        <section className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6 text-center shadow-[0_3px_14px_rgb(15_23_42/0.04)]">
          <h1 className="text-lg font-semibold text-slate-950">
            The result could not be displayed
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your submission was received, but its Big Five result data did not
            match the expected instrument version. Contact the assessment
            administrator for support.
          </p>
        </section>
      </ParticipantExperienceShell>
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
                Question map
              </h2>
              <span className="text-[9px] text-slate-400">
                {answeredCount} answered
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2.5 text-[8px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-600" /> Current
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-cyan-400" /> Answered
              </span>
            </div>
            <div className="mt-3">
              <QuestionGrid
                answers={answers}
                currentIndex={currentIndex}
                density="comfortable"
                onSelect={goToQuestion}
                questions={test.questions}
              />
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
                  Question map
                </p>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {answeredCount} of {test.questions.length} answered
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
                <span className="size-2 rounded-full bg-cyan-400" /> Answered
              </span>
            </div>
            <QuestionGrid
              answers={answers}
              currentIndex={currentIndex}
              onSelect={goToQuestion}
              questions={test.questions}
            />
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
                Question {question.no} of {test.questions.length}
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
              {question.prompt}
            </h1>
            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
              <Lightbulb className="text-blue-500" size={15} />
              Choose the option that describes you best. Your selection will
              move to the next question automatically.
            </div>
          </div>

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

          {error ? (
            <p className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:mx-7">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5 sm:px-7">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => goToQuestion(currentIndex - 1)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {currentIndex === test.questions.length - 1 ? (
              <div className="flex flex-wrap items-center gap-3">
                {!isComplete ? (
                  <p className="text-[11px] text-slate-500">
                    {test.questions.length - answeredCount} unanswered
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={
                    !isComplete || isSubmitting || draftStatus === "saving"
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

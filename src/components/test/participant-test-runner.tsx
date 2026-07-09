"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";

import type { PublicTestQuestion, TestKey } from "@/tests/shared/types";

interface PublicParticipantTest {
  key: TestKey;
  name: string;
  version: string;
  estimatedMinutes: number;
  questions: PublicTestQuestion[];
}

interface ParticipantTestRunnerProps {
  token: string;
  organizationName: string;
  initialStatus: "active" | "in_progress";
  test: PublicParticipantTest;
}

type Answers = Record<string, string>;
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
  };
  persisted: boolean;
}

export function ParticipantTestRunner({
  token,
  organizationName,
  initialStatus,
  test,
}: ParticipantTestRunnerProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState(initialStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] =
    useState<SubmittedResult | null>(null);

  const question = test.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === test.questions.length;
  const progress = (answeredCount / test.questions.length) * 100;
  const draftLabel =
    draftStatus === "loading"
      ? "Loading"
      : draftStatus === "saving"
        ? "Saving"
        : draftStatus === "saved"
          ? "Saved"
          : draftStatus === "error"
            ? "Error"
            : "Ready";

  useEffect(() => {
    if (initialStatus !== "active") {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/test/${encodeURIComponent(token)}/start`, {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "Unable to start token.");
        }

        return response.json();
      })
      .then((body) => setStatus(body.status))
      .catch((startError) => {
        if (!controller.signal.aborted) {
          setError(
            startError instanceof Error
              ? startError.message
              : "Unable to start token.",
          );
        }
      });

    return () => controller.abort();
  }, [initialStatus, token]);

  const persistDraft = useCallback(
    async (
      nextAnswers: Answers,
      nextQuestionIndex: number,
      signal?: AbortSignal,
    ) => {
      if (submittedResult || !Object.keys(nextAnswers).length) {
        return;
      }

      setDraftStatus("saving");

      const response = await fetch(`/api/test/${encodeURIComponent(token)}/draft`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers: nextAnswers,
          currentQuestionIndex: nextQuestionIndex,
        }),
        signal,
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to save draft answers.");
      }

      setDraftStatus("saved");
    },
    [submittedResult, token],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/test/${encodeURIComponent(token)}/draft`, {
      method: "GET",
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to load draft answers.");
        }

        return body.draft as
          | {
              answers: Answers;
              currentQuestionIndex: number;
              updatedAt: string;
            }
          | null;
      })
      .then((draft) => {
        if (draft) {
          setAnswers(draft.answers);
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
  }, [test.questions.length, token]);

  useEffect(() => {
    if (
      !hasLoadedDraft ||
      submittedResult ||
      !Object.keys(answers).length
    ) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      persistDraft(answers, currentIndex, controller.signal).catch(
        (draftError) => {
          if (!controller.signal.aborted) {
            setDraftStatus("error");
            setError(
              draftError instanceof Error
                ? draftError.message
                : "Unable to save draft answers.",
            );
          }
        },
      );
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    answers,
    currentIndex,
    hasLoadedDraft,
    persistDraft,
    submittedResult,
  ]);

  const canGoBack = currentIndex > 0;
  const canGoForward =
    currentIndex < test.questions.length - 1 && Boolean(answers[question.id]);

  const selectedResultTitle = useMemo(() => {
    if (!submittedResult) {
      return null;
    }

    const result = submittedResult.score.result;
    const type = result.type ?? submittedResult.score.summary.type;
    return [type, result.name].filter(Boolean).join(" - ");
  }, [submittedResult]);

  function selectAnswer(questionId: string, value: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
    setError(null);
  }

  function goToQuestion(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), test.questions.length - 1);

    if (hasLoadedDraft && Object.keys(answers).length) {
      persistDraft(answers, nextIndex).catch((draftError) => {
        setDraftStatus("error");
        setError(
          draftError instanceof Error
            ? draftError.message
            : "Unable to save draft answers.",
        );
      });
    }

    setCurrentIndex(nextIndex);
  }

  async function submitAnswers() {
    if (!isComplete || isSubmitting) {
      setError("All questions must be answered before submission.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/test/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
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

  if (submittedResult) {
    const result = submittedResult.score.result;
    const dimensions = submittedResult.score.summary.dimensions ?? [];

    return (
      <main className="min-h-screen bg-background px-5 py-6 text-foreground lg:px-8">
        <section className="mx-auto max-w-5xl rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-accent">
                {organizationName}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">
                {selectedResultTitle}
              </h1>
              <p className="mt-2 text-sm text-foreground/65">
                {result.epithet} / {test.name}
              </p>
            </div>
            {result.imagePath ? (
              <Image
                src={result.imagePath}
                alt=""
                width={96}
                height={96}
                className="rounded-lg border border-border bg-background"
              />
            ) : null}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              {dimensions.map((dimension) => {
                const total = dimension.leftScore + dimension.rightScore || 1;
                const leftPercent = (dimension.leftScore / total) * 100;

                return (
                  <div
                    key={dimension.code}
                    className="rounded-lg border border-border bg-surface p-4"
                  >
                    <div className="flex items-center justify-between font-mono text-sm">
                      <span>{dimension.left}</span>
                      <span className="font-semibold text-accent">
                        {dimension.selected}
                      </span>
                      <span>{dimension.right}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-sm bg-surface-muted">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${leftPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between font-mono text-xs text-foreground/60">
                      <span>{dimension.leftScore}</span>
                      <span>{dimension.rightScore}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <article>
              <h2 className="text-xl font-semibold">{result.nameDescription}</h2>
              <p className="mt-3 max-h-60 overflow-auto pr-2 text-sm leading-6 text-foreground/70">
                {result.description}
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">General Traits</h3>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/70">
                    {(result.generalTraits ?? []).slice(0, 6).map((trait) => (
                      <li key={trait} className="flex gap-2">
                        <Check className="mt-0.5 shrink-0 text-accent" size={15} />
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold">Strengths</h3>
                  <ul className="mt-3 space-y-2 text-sm text-foreground/70">
                    {(result.strengths ?? []).slice(0, 6).map((strength) => (
                      <li key={strength} className="flex gap-2">
                        <Check className="mt-0.5 shrink-0 text-accent" size={15} />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground lg:px-8">
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            {organizationName}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            {test.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-foreground/65">
            Answer every item before submitting. You can use the question map
            to review earlier responses.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="text-foreground/60">Status</dt>
              <dd className="font-mono">{status}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="text-foreground/60">Version</dt>
              <dd className="font-mono">{test.version}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="text-foreground/60">Questions</dt>
              <dd className="font-mono">
                {answeredCount}/{test.questions.length}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="text-foreground/60">Draft</dt>
              <dd
                className={`font-mono ${
                  draftStatus === "error" ? "text-danger" : ""
                }`}
              >
                {draftLabel}
              </dd>
            </div>
          </dl>
          <div className="mt-5 h-2 overflow-hidden rounded-sm bg-surface-muted">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Question Map</h2>
              <span className="font-mono text-xs text-foreground/55">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {test.questions.map((mappedQuestion, index) => {
                const answered = Boolean(answers[mappedQuestion.id]);
                const current = index === currentIndex;

                return (
                  <button
                    key={mappedQuestion.id}
                    type="button"
                    onClick={() => goToQuestion(index)}
                    className={`aspect-square rounded-sm border text-[11px] font-medium ${
                      current
                        ? "border-accent bg-accent text-white"
                        : answered
                          ? "border-accent/40 bg-accent-muted text-accent"
                          : "border-border text-foreground/50 hover:border-accent"
                    }`}
                    aria-label={`Go to question ${mappedQuestion.no}`}
                  >
                    {mappedQuestion.no}
                  </button>
                );
              })}
            </div>
          </div>
          {error ? (
            <p className="mt-4 rounded-lg border border-danger/35 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </aside>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="font-mono text-sm text-foreground/55">
                Question {question.no}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                {question.prompt}
              </h2>
            </div>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 font-mono text-xs text-foreground/65">
              {test.estimatedMinutes} min
            </span>
          </div>

          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Answer options</legend>
            {question.options.map((option) => {
              const isSelected = answers[question.id] === option.value;

              return (
                <label
                  key={option.value}
                  className={`grid cursor-pointer grid-cols-[28px_1fr] items-center gap-3 rounded-lg border p-4 transition ${
                    isSelected
                      ? "border-accent bg-accent-muted"
                      : "border-border bg-surface hover:border-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.value}
                    checked={isSelected}
                    onChange={() => selectAnswer(question.id, option.value)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm leading-6">{option.label}</span>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => goToQuestion(currentIndex - 1)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground/75 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {currentIndex === test.questions.length - 1 ? (
              <div className="flex flex-wrap items-center gap-3">
                {!isComplete ? (
                  <p className="text-sm text-foreground/60">
                    {test.questions.length - answeredCount} unanswered
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={!isComplete || isSubmitting}
                  onClick={submitAnswers}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  Submit
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canGoForward}
                onClick={() => goToQuestion(currentIndex + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

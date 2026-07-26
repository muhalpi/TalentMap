"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, LockKeyhole } from "lucide-react";

export function ParticipantAccessForm({
  initialError,
}: {
  initialError?: string | null;
}) {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessCode.trim() || isPending) {
      return;
    }

    startTransition(async () => {
      setError(null);

      try {
        const response = await fetch("/api/test/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessCode }),
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body.error ?? "Unable to verify assessment access.");
        }

        router.replace("/test");
        router.refresh();
      } catch (accessError) {
        setError(
          accessError instanceof Error
            ? accessError.message
            : "Unable to verify assessment access.",
        );
      }
    });
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f7f9fc] px-5 py-8 text-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,0.13),transparent_62%)]"
      />
      <section
        aria-labelledby="assessment-access-title"
        className="relative w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-6 shadow-[0_12px_40px_rgb(15_23_42/0.07)] sm:p-8"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-[0_6px_16px_rgb(37_99_235/0.22)]"
          >
            <LockKeyhole size={19} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              TalentMap assessment
            </p>
            <h1
              id="assessment-access-title"
              className="mt-1 text-2xl font-semibold tracking-[-0.03em]"
            >
              Enter your access code
            </h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-600">
          Use the participant-specific code supplied by your organization. Your
          code opens only the assessment assigned to your profile.
        </p>

        <form className="mt-6" onSubmit={submit} noValidate>
          <label
            className="block text-sm font-semibold text-slate-800"
            htmlFor="participant-access-code"
          >
            Access code
          </label>
          <div className="relative mt-2">
            <KeyRound
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />
            <input
              id="participant-access-code"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value.toUpperCase())}
              aria-describedby={error ? "participant-access-error" : "participant-access-help"}
              aria-invalid={Boolean(error)}
              autoCapitalize="characters"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="TM-ABCD-EFGH-JKLM-NPQR"
              className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 font-mono text-sm uppercase tracking-[0.04em] text-slate-950 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            />
          </div>
          <p
            id="participant-access-help"
            className="mt-2 text-xs leading-5 text-slate-500"
          >
            You can paste the complete code, including its dashes.
          </p>

          {error ? (
            <p
              id="participant-access-error"
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending || !accessCode.trim()}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgb(37_99_235/0.2)] transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
          >
            {isPending ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={17} />
            ) : (
              <ArrowRight aria-hidden="true" size={17} />
            )}
            {isPending ? "Verifying access" : "Continue to assessment"}
          </button>
        </form>

        <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          If your code was lost or replaced, ask your organization&apos;s
          assessment administrator for a new one.
        </p>
      </section>
    </main>
  );
}

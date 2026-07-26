"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

export function ParticipantAccessResetButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetAccess() {
    startTransition(async () => {
      setError(null);

      try {
        const response = await fetch("/api/test/access", { method: "DELETE" });

        if (!response.ok) {
          throw new Error("Unable to clear assessment access.");
        }

        router.replace("/test");
        router.refresh();
      } catch (resetError) {
        setError(
          resetError instanceof Error
            ? resetError.message
            : "Unable to clear assessment access.",
        );
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={resetAccess}
        disabled={isPending}
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-500 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <KeyRound aria-hidden="true" size={16} />
        )}
        Use another access code
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

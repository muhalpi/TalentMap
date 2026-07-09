"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

interface FormActionState {
  status: "idle" | "success" | "error";
  message: string;
}

export function SubmitButton({
  children,
  pendingLabel = "Saving",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="animate-spin" size={16} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ActionMessage({ state }: { state: FormActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-lg border p-3 text-sm ${
        state.status === "success"
          ? "border-accent/35 bg-accent/10 text-accent"
          : "border-danger/35 bg-danger/10 text-danger"
      }`}
      aria-live="polite"
    >
      {state.message}
    </p>
  );
}

export function FieldError({
  errors,
}: {
  errors: string[] | undefined;
}) {
  if (!errors?.length) {
    return null;
  }

  return <p className="mt-1 text-xs text-danger">{errors[0]}</p>;
}

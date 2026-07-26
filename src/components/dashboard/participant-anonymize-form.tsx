"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ShieldOff } from "lucide-react";

import {
  anonymizeParticipantAction,
  type ParticipantActionState,
} from "@/app/dashboard/participants/actions";
import { ActionMessage, FieldError } from "@/components/admin/form-controls";

const initialState: ParticipantActionState = {
  status: "idle",
  message: "",
};

function AnonymizeButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-danger px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="animate-spin" size={16} /> : <ShieldOff size={16} />}
      {pending ? "Anonymizing" : "Anonymize participant"}
    </button>
  );
}

export function ParticipantAnonymizeForm({
  participantId,
}: {
  participantId: string;
}) {
  const [state, formAction] = useActionState(
    anonymizeParticipantAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border border-danger/25 bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <input type="hidden" name="participantId" value={participantId} />

      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-danger/10 text-danger">
          <ShieldOff size={16} />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Anonymization</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/60">
            Wipes identity fields, removes drafts, expires live access, and
            keeps retained results only as unlinked records.
          </p>
        </div>
      </div>

      <label
        className="mt-4 block text-sm font-medium"
        htmlFor="anonymize-reason"
      >
        Reason
      </label>
      <textarea
        id="anonymize-reason"
        name="reason"
        rows={3}
        className="mt-2 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
      />
      <FieldError errors={state.fieldErrors?.reason} />

      <label
        className="mt-4 block text-sm font-medium"
        htmlFor="anonymize-confirmation"
      >
        Confirmation
      </label>
      <input
        id="anonymize-confirmation"
        name="confirmation"
        placeholder="ANONYMIZE"
        className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-foreground"
      />
      <p className="mt-2 text-xs text-foreground/55">
        Type ANONYMIZE to confirm.
      </p>
      <FieldError errors={state.fieldErrors?.confirmation} />

      <div className="mt-4">
        <AnonymizeButton />
      </div>

      <div className="mt-4">
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

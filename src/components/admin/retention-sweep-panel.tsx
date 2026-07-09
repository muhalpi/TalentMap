"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";

import {
  runRetentionSweepAction,
  type RetentionActionState,
} from "@/app/admin/retention/actions";

import { ActionMessage, SubmitButton } from "./form-controls";

const initialState: RetentionActionState = {
  status: "idle",
  message: "",
};

export function RetentionSweepPanel() {
  const [state, formAction] = useActionState(
    runRetentionSweepAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Manual Sweep</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/60">
            Flags due results and anonymizes already flagged records after the
            grace window.
          </p>
        </div>
        <ShieldCheck className="text-accent" size={20} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Running">Run Retention Sweep</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

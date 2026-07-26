"use client";

import { useActionState } from "react";

import {
  createClientAction,
  type AdminActionState,
} from "@/app/admin/clients/actions";
import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";

import { ActionMessage, FieldError, SubmitButton } from "./form-controls";

const initialState: AdminActionState = {
  status: "idle",
  message: "",
};

export function ClientCreateForm() {
  const [state, formAction] = useActionState(createClientAction, initialState);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <h2 className="text-lg font-semibold">Client Identity</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/60">
            Create the tenant shell. Real authentication can be attached after
            the provisioning workflow is stable.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Client name
              <input
                name="name"
                required
                minLength={2}
                placeholder="Northstar Advisory"
                className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              />
              <FieldError errors={state.fieldErrors?.name} />
            </label>

            <label className="block text-sm font-medium">
              Slug
              <input
                name="slug"
                placeholder="northstar-advisory"
                className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm"
              />
              <FieldError errors={state.fieldErrors?.slug} />
            </label>

            <label className="block text-sm font-medium">
              Status
              <select
                name="status"
                defaultValue="active"
                className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
              <FieldError errors={state.fieldErrors?.status} />
            </label>

          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Contract Window</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/60">
            Participant assessment access and result retention follow these
            dates.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="block text-sm font-medium">
              Starts
              <input
                name="contractStartsAt"
                type="date"
                required
                className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm"
              />
              <FieldError errors={state.fieldErrors?.contractStartsAt} />
            </label>

            <label className="block text-sm font-medium">
              Ends
              <input
                name="contractEndsAt"
                type="date"
                required
                className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm"
              />
              <FieldError errors={state.fieldErrors?.contractEndsAt} />
            </label>

            <div className="rounded-lg border border-border bg-background p-3 text-sm leading-6 text-foreground/65">
              Results are retained through the contract end date, then enter a{" "}
              {RETENTION_DELETE_GRACE_DAYS} day grace period before
              anonymization.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h2 className="text-lg font-semibold">Initial Contact</h2>
        <p className="mt-1 text-sm leading-6 text-foreground/60">
          Optional client admin record only. No credentials are issued here.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">
            Admin email
            <input
              name="clientAdminEmail"
              type="email"
              placeholder="admin@client.example"
              className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
            />
            <FieldError errors={state.fieldErrors?.clientAdminEmail} />
          </label>

          <label className="block text-sm font-medium">
            Admin name
            <input
              name="clientAdminName"
              placeholder="Client Admin"
              className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
            />
            <FieldError errors={state.fieldErrors?.clientAdminName} />
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Creating">Create Client</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

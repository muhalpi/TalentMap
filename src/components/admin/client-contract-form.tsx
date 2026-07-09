"use client";

import { useActionState } from "react";

import {
  updateClientContractAction,
  type AdminActionState,
} from "@/app/admin/clients/actions";
import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";
import type { AdminClientDetailDto } from "@/services/dashboard-service";

import { ActionMessage, FieldError, SubmitButton } from "./form-controls";

const initialState: AdminActionState = {
  status: "idle",
  message: "",
};

function dateValue(value: string) {
  return value.slice(0, 10);
}

export function ClientContractForm({
  client,
}: {
  client: AdminClientDetailDto["client"];
}) {
  const updateWithClientId = updateClientContractAction.bind(
    null,
    client.clientId,
  );
  const [state, formAction] = useActionState(updateWithClientId, initialState);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <h2 className="text-lg font-semibold">Contract Settings</h2>
      <p className="mt-1 text-sm leading-6 text-foreground/60">
        These values control token eligibility, expiry boundaries, and result
        retention.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Client name
          <input
            name="name"
            required
            minLength={2}
            defaultValue={client.name}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          />
          <FieldError errors={state.fieldErrors?.name} />
        </label>

        <label className="block text-sm font-medium">
          Slug
          <input
            name="slug"
            defaultValue={client.slug}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm"
          />
          <FieldError errors={state.fieldErrors?.slug} />
        </label>

        <label className="block text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={client.status}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>
          <FieldError errors={state.fieldErrors?.status} />
        </label>

        <label className="block text-sm font-medium">
          Starts
          <input
            name="contractStartsAt"
            type="date"
            required
            defaultValue={dateValue(client.contractStartsAt)}
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
            defaultValue={dateValue(client.contractEndsAt)}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm"
          />
          <FieldError errors={state.fieldErrors?.contractEndsAt} />
        </label>

        <div className="rounded-lg border border-border bg-background p-3 text-sm leading-6 text-foreground/65 md:col-span-2">
          Results are retained through the contract end date. After that, they
          are flagged for deletion and anonymized after a{" "}
          {RETENTION_DELETE_GRACE_DAYS} day grace period unless the contract is
          renewed.
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SubmitButton>Save Contract</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

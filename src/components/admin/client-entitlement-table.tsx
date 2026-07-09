"use client";

import { useActionState } from "react";

import {
  updateClientEntitlementAction,
  type AdminActionState,
} from "@/app/admin/clients/actions";
import type { AdminClientTestProvisioningDto } from "@/services/dashboard-service";

import { ActionMessage, FieldError, SubmitButton } from "./form-controls";

const initialState: AdminActionState = {
  status: "idle",
  message: "",
};

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function EntitlementRow({
  clientId,
  item,
}: {
  clientId: string;
  item: AdminClientTestProvisioningDto;
}) {
  const updateWithClientId = updateClientEntitlementAction.bind(null, clientId);
  const [state, formAction] = useActionState(updateWithClientId, initialState);
  const entitlement = item.entitlement;
  const quotaAllocated = entitlement?.quotaUsed ?? 0;
  const quotaReserved = entitlement?.quotaReserved ?? 0;
  const quotaConsumed = entitlement?.quotaConsumed ?? 0;
  const quotaTotal = entitlement?.quotaTotal ?? 50;
  const quotaAvailable = entitlement?.quotaAvailable ?? quotaTotal;
  const enabled = Boolean(entitlement?.isEnabled && item.implemented);

  return (
    <form
      action={formAction}
      className="grid grid-cols-[1.4fr_0.65fr_0.75fr_0.65fr_0.85fr_0.7fr_1.1fr] items-center gap-4 border-b border-border px-5 py-4 last:border-b-0"
    >
      <input type="hidden" name="testKey" value={item.testKey} />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{item.testName}</p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              entitlement ? "bg-accent-muted text-accent" : "bg-surface-muted text-foreground/65"
            }`}
          >
            {entitlement ? "Unlocked" : "Not assigned"}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-foreground/55">
          {item.testKey} / {item.version}
        </p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-foreground/55">
          {item.description}
        </p>
      </div>

      <label className="block text-xs font-medium uppercase tracking-wide text-foreground/50">
        Quota
        <input
          name="quotaTotal"
          type="number"
          min={quotaAllocated}
          max={100000}
          defaultValue={quotaTotal}
          className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-foreground"
        />
        <FieldError errors={state.fieldErrors?.quotaTotal} />
      </label>

      <label className="block text-xs font-medium uppercase tracking-wide text-foreground/50">
        Expires
        <input
          name="quotaExpiresAt"
          type="date"
          defaultValue={dateValue(entitlement?.quotaExpiresAt)}
          className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-foreground"
        />
        <FieldError errors={state.fieldErrors?.quotaExpiresAt} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          name="isEnabled"
          type="checkbox"
          defaultChecked={enabled}
          disabled={!item.implemented}
          className="h-4 w-4 accent-[var(--accent)] disabled:opacity-40"
        />
        Enabled
      </label>

      <div>
        <p className="font-mono text-sm">
          {quotaAllocated}/{quotaTotal}
        </p>
        <p className="mt-1 text-xs text-foreground/55">
          {quotaAvailable} available
        </p>
        <p className="mt-1 text-xs text-foreground/55">
          {quotaReserved} reserved / {quotaConsumed} consumed
        </p>
        <p
          className={`mt-2 w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
            item.implemented
              ? "bg-surface-muted text-foreground/65"
              : "bg-warning/15 text-warning"
          }`}
        >
          {item.implemented ? "Adapted" : "Pending adaptation"}
        </p>
      </div>

      <SubmitButton pendingLabel="Saving">Save</SubmitButton>

      <ActionMessage state={state} />
    </form>
  );
}

export function ClientEntitlementTable({
  clientId,
  tests,
}: {
  clientId: string;
  tests: AdminClientTestProvisioningDto[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="min-w-[1120px]">
        <div className="grid grid-cols-[1.4fr_0.65fr_0.75fr_0.65fr_0.85fr_0.7fr_1.1fr] gap-4 border-b border-border bg-surface-muted px-5 py-3 text-xs font-medium uppercase tracking-wide text-foreground/55">
          <span>Instrument</span>
          <span>Quota</span>
          <span>Expiry</span>
          <span>Access</span>
          <span>Usage</span>
          <span>Action</span>
          <span>State</span>
        </div>
        {tests.map((item) => (
          <EntitlementRow
            key={item.testKey}
            clientId={clientId}
            item={item}
          />
        ))}
      </div>
    </div>
  );
}

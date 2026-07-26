"use client";

import { useActionState } from "react";
import { Pencil } from "lucide-react";

import {
  updateParticipantAction,
  type ParticipantActionState,
} from "@/app/dashboard/participants/actions";
import {
  ActionMessage,
  FieldError,
  SubmitButton,
} from "@/components/admin/form-controls";
import { ParticipantCustomFieldsForm } from "@/components/dashboard/participant-custom-fields-form";
import type { ParticipantDetailDto } from "@/services/participant-directory-service";
import type { ParticipantFieldDefinitionDto } from "@/services/participant-field-service";

const initialState: ParticipantActionState = {
  status: "idle",
  message: "",
};

export function ParticipantEditForm({
  participant,
  definitions,
}: {
  participant: ParticipantDetailDto;
  definitions: ParticipantFieldDefinitionDto[];
}) {
  const updateWithParticipantId = updateParticipantAction.bind(
    null,
    participant.id,
  );
  const [state, formAction] = useActionState(
    updateWithParticipantId,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/60">
            Update participant identity and tenant-defined profile fields.
          </p>
        </div>
        <Pencil className="shrink-0 text-accent" size={20} />
      </div>

      <div className="mt-5 grid gap-4">
        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            required
            minLength={2}
            defaultValue={participant.name}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          />
          <FieldError errors={state.fieldErrors?.name} />
        </label>

        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            defaultValue={participant.email ?? ""}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
          />
          <FieldError errors={state.fieldErrors?.email} />
        </label>

        <label className="block text-sm font-medium">
          Identifier
          <input
            name="employeeId"
            defaultValue={participant.employeeId ?? ""}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm"
          />
          <FieldError errors={state.fieldErrors?.employeeId} />
        </label>

        <label className="block text-sm font-medium">
          External reference
          <input
            name="externalReference"
            defaultValue={participant.externalReference ?? ""}
            className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm"
          />
          <FieldError errors={state.fieldErrors?.externalReference} />
        </label>
      </div>

      <div className="mt-5 grid gap-5 border-t border-border pt-5">
        {definitions.length ? (
          <div>
            <h3 className="text-sm font-semibold">Custom profile fields</h3>
            <div className="mt-4">
              <ParticipantCustomFieldsForm
                definitions={definitions}
                values={participant.metadata?.customFields}
                fieldErrors={state.fieldErrors}
                idPrefix={`edit-participant-${participant.id}`}
              />
            </div>
          </div>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold">Tags</h3>
          <div className="mt-4">
            <label className="block text-sm font-medium">
              Tags
              <input
                name="tags"
                defaultValue={participant.metadata?.tags?.join(", ") ?? ""}
                className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              />
              <FieldError errors={state.fieldErrors?.tags} />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SubmitButton>Save Profile</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

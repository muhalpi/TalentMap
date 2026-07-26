"use client";

import { useActionState, useState } from "react";
import { Archive, ArchiveRestore, ListPlus, Settings2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import {
  createParticipantFieldAction,
  setParticipantFieldActiveAction,
  updateParticipantFieldAction,
  type ParticipantFieldActionState,
} from "@/app/dashboard/participants/field-actions";
import {
  ActionMessage,
  FieldError,
  SubmitButton,
} from "@/components/admin/form-controls";
import {
  participantFieldTypeLabels,
  type ParticipantFieldDefinitionDto,
  type ParticipantFieldType,
} from "@/services/participant-field-service";

const initialState: ParticipantFieldActionState = {
  status: "idle",
  message: "",
};

const fieldTypes = Object.entries(participantFieldTypeLabels) as [
  ParticipantFieldType,
  string,
][];

const controlClassName =
  "mt-2 min-h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

function FieldFlags({
  defaults,
}: {
  defaults?: ParticipantFieldDefinitionDto;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="flex min-h-10 items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          name="isRequired"
          defaultChecked={defaults?.isRequired}
          className="size-4 rounded border-border accent-accent"
        />
        Required
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          name="isSearchable"
          defaultChecked={defaults ? defaults.isSearchable : true}
          className="size-4 rounded border-border accent-accent"
        />
        Searchable
      </label>
      <label className="flex min-h-10 items-center gap-2 text-sm font-normal">
        <input
          type="checkbox"
          name="isSensitive"
          defaultChecked={defaults?.isSensitive}
          className="size-4 rounded border-border accent-accent"
        />
        Sensitive
      </label>
    </div>
  );
}

function OptionsField({
  defaultOptions = [],
  errors,
}: {
  defaultOptions?: string[];
  errors?: string[];
}) {
  return (
    <label className="block text-sm font-medium">
      Available options
      <textarea
        name="options"
        rows={3}
        required
        defaultValue={defaultOptions.join("\n")}
        placeholder={"Grade 7\nGrade 8\nGrade 9"}
        className={controlClassName}
      />
      <span className="mt-1 block text-xs font-normal text-foreground/55">
        Enter one option per line. A comma or semicolon also works.
      </span>
      <FieldError errors={errors} />
    </label>
  );
}

function CreateFieldForm() {
  const [state, formAction] = useActionState(
    createParticipantFieldAction,
    initialState,
  );
  const [fieldType, setFieldType] = useState<ParticipantFieldType>("text");
  const usesOptions = fieldType === "select" || fieldType === "multi_select";

  return (
    <form action={formAction} className="grid content-start gap-4">
      <div>
        <h3 className="text-sm font-semibold">Add a profile field</h3>
        <p className="mt-1 text-sm leading-6 text-foreground/60">
          Use language that fits your organization, such as Grade, Class,
          Department, or Student ID.
        </p>
      </div>
      <label className="block text-sm font-medium">
        Field label
        <input
          name="label"
          required
          maxLength={80}
          placeholder="Grade level"
          className={controlClassName}
        />
        <FieldError errors={state.fieldErrors?.label} />
      </label>
      <label className="block text-sm font-medium">
        Field type
        <select
          name="fieldType"
          value={fieldType}
          onChange={(event) =>
            setFieldType(event.target.value as ParticipantFieldType)
          }
          className={controlClassName}
        >
          {fieldTypes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.fieldType} />
      </label>
      {usesOptions ? (
        <OptionsField errors={state.fieldErrors?.options} />
      ) : null}
      <FieldFlags />
      <p className="text-xs leading-5 text-foreground/55">
        Sensitive fields are automatically excluded from search and participant
        list summaries.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Adding">Add field</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function ToggleFieldButton({ makeActive }: { makeActive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:border-accent/45 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {makeActive ? <ArchiveRestore size={15} /> : <Archive size={15} />}
      {pending ? "Saving" : makeActive ? "Restore field" : "Archive field"}
    </button>
  );
}

function FieldRow({
  definition,
}: {
  definition: ParticipantFieldDefinitionDto;
}) {
  const updateAction = updateParticipantFieldAction.bind(null, definition.id);
  const toggleAction = setParticipantFieldActiveAction.bind(
    null,
    definition.id,
    !definition.isActive,
  );
  const [updateState, updateFormAction] = useActionState(
    updateAction,
    initialState,
  );
  const [toggleState, toggleFormAction] = useActionState(
    toggleAction,
    initialState,
  );
  const usesOptions =
    definition.fieldType === "select" ||
    definition.fieldType === "multi_select";

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium">{definition.label}</h4>
            {!definition.isActive ? (
              <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-foreground/60">
                Archived
              </span>
            ) : null}
            {definition.isRequired ? (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                Required
              </span>
            ) : null}
            {definition.isSensitive ? (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs text-warning">
                Sensitive
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-foreground/55">
            {participantFieldTypeLabels[definition.fieldType]} · key:{" "}
            {definition.fieldKey}
          </p>
        </div>
        <span className="text-xs text-foreground/50">
          {definition.isSearchable && !definition.isSensitive
            ? "Included in search"
            : "Excluded from search"}
        </span>
      </div>

      {definition.isActive ? (
        <details className="mt-3 border-t border-border pt-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm font-medium text-accent">
            <Settings2 size={15} /> Edit settings
          </summary>
          <form action={updateFormAction} className="mt-3 grid gap-4">
            <input
              type="hidden"
              name="fieldType"
              value={definition.fieldType}
            />
            <label className="block text-sm font-medium">
              Field label
              <input
                name="label"
                required
                maxLength={80}
                defaultValue={definition.label}
                className={controlClassName}
              />
              <FieldError errors={updateState.fieldErrors?.label} />
            </label>
            {usesOptions ? (
              <OptionsField
                defaultOptions={definition.options}
                errors={updateState.fieldErrors?.options}
              />
            ) : null}
            <FieldFlags defaults={definition} />
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton pendingLabel="Updating">Update field</SubmitButton>
              <ActionMessage state={updateState} />
            </div>
          </form>
        </details>
      ) : null}

      <form
        action={toggleFormAction}
        className="mt-3 border-t border-border pt-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <ToggleFieldButton makeActive={!definition.isActive} />
          <ActionMessage state={toggleState} />
        </div>
      </form>
    </div>
  );
}

export function ParticipantFieldManager({
  definitions,
}: {
  definitions: ParticipantFieldDefinitionDto[];
}) {
  const activeCount = definitions.filter((field) => field.isActive).length;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Participant profile fields</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-foreground/60">
            Define the information your tenant collects. Name remains mandatory,
            while email, identifier, reference, and tags stay available as
            standard fields.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
          <ListPlus size={15} /> {activeCount} active
        </div>
      </div>

      <div className="mt-5 grid gap-6 border-t border-border pt-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <CreateFieldForm />
        <div>
          <h3 className="text-sm font-semibold">Configured fields</h3>
          <div className="mt-3 grid gap-3">
            {definitions.length ? (
              definitions.map((definition) => (
                <FieldRow key={definition.id} definition={definition} />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-5 text-sm leading-6 text-foreground/60">
                No custom fields yet. Add only the fields that make sense for
                this tenant.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

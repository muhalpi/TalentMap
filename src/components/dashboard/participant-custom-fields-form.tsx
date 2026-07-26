import {
  participantCustomFieldName,
  participantFieldDisplayValue,
  type ParticipantCustomFieldValue,
  type ParticipantFieldDefinitionDto,
} from "@/services/participant-field-service";

interface ParticipantCustomFieldsFormProps {
  definitions: ParticipantFieldDefinitionDto[];
  values?: Record<string, ParticipantCustomFieldValue>;
  fieldErrors?: Record<string, string[]>;
  idPrefix: string;
}

const inputClassName =
  "mt-2 min-h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export function ParticipantCustomFieldsForm({
  definitions,
  values = {},
  fieldErrors = {},
  idPrefix,
}: ParticipantCustomFieldsFormProps) {
  const activeDefinitions = definitions.filter((field) => field.isActive);
  if (!activeDefinitions.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {activeDefinitions.map((definition) => {
        const name = participantCustomFieldName(definition.fieldKey);
        const id = `${idPrefix}-${definition.fieldKey}`;
        const errors = fieldErrors[name];
        const currentValue = values[definition.fieldKey];
        const describedBy = [
          definition.isSensitive ? `${id}-hint` : null,
          errors?.length ? `${id}-error` : null,
        ]
          .filter(Boolean)
          .join(" ");
        const sharedProps = {
          id,
          name,
          required: definition.isRequired,
          "aria-invalid": errors?.length ? true : undefined,
          "aria-describedby": describedBy || undefined,
          className: inputClassName,
        };

        return (
          <div
            key={definition.id}
            className={
              definition.fieldType === "long_text" ? "sm:col-span-2" : ""
            }
          >
            <label htmlFor={id} className="block text-sm font-medium">
              {definition.label}
              {definition.isRequired ? (
                <span className="ml-1 text-danger" aria-hidden="true">
                  *
                </span>
              ) : null}
            </label>

            {definition.fieldType === "long_text" ? (
              <textarea
                {...sharedProps}
                rows={3}
                defaultValue={participantFieldDisplayValue(currentValue) ?? ""}
              />
            ) : definition.fieldType === "select" ? (
              <select
                {...sharedProps}
                defaultValue={participantFieldDisplayValue(currentValue) ?? ""}
              >
                <option value="">Select an option</option>
                {definition.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : definition.fieldType === "multi_select" ? (
              <fieldset
                id={id}
                aria-invalid={errors?.length ? true : undefined}
                aria-describedby={describedBy || undefined}
                className="mt-2 grid gap-2 rounded-md border border-border bg-surface p-3"
              >
                <legend className="sr-only">{definition.label}</legend>
                {definition.options.map((option) => (
                  <label
                    key={option}
                    className="flex min-h-10 items-center gap-3 text-sm font-normal"
                  >
                    <input
                      type="checkbox"
                      name={name}
                      value={option}
                      defaultChecked={
                        Array.isArray(currentValue) &&
                        currentValue.includes(option)
                      }
                      className="size-4 rounded border-border accent-accent"
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ) : definition.fieldType === "boolean" ? (
              <select
                {...sharedProps}
                defaultValue={
                  typeof currentValue === "boolean"
                    ? currentValue
                      ? "yes"
                      : "no"
                    : ""
                }
              >
                <option value="">Select Yes or No</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            ) : (
              <input
                {...sharedProps}
                type={
                  definition.fieldType === "number"
                    ? "number"
                    : definition.fieldType === "date"
                      ? "date"
                      : definition.fieldType === "email"
                        ? "email"
                        : definition.fieldType === "phone"
                          ? "tel"
                          : "text"
                }
                step={definition.fieldType === "number" ? "any" : undefined}
                autoComplete={
                  definition.fieldType === "email"
                    ? "email"
                    : definition.fieldType === "phone"
                      ? "tel"
                      : "off"
                }
                defaultValue={participantFieldDisplayValue(currentValue) ?? ""}
              />
            )}

            {definition.isSensitive ? (
              <p id={`${id}-hint`} className="mt-1 text-xs text-foreground/55">
                Sensitive field. It is excluded from participant search and
                table summaries.
              </p>
            ) : null}
            {errors?.length ? (
              <p id={`${id}-error`} className="mt-1 text-xs text-danger">
                {errors[0]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

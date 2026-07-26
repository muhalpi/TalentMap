"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireClientSession } from "@/auth/guards";
import { getDb } from "@/db/client";
import { participantFieldDefinitions } from "@/db/schema";
import {
  participantFieldKeyFromLabel,
  type ParticipantFieldType,
} from "@/services/participant-field-service";

export interface ParticipantFieldActionState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
}

const fieldTypes = [
  "text",
  "long_text",
  "number",
  "date",
  "email",
  "phone",
  "select",
  "multi_select",
  "boolean",
] as const satisfies readonly ParticipantFieldType[];

const fieldSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Field label is required.")
    .max(80, "Field label must contain at most 80 characters."),
  fieldType: z.enum(fieldTypes),
  options: z.string().max(2_500).optional(),
  isRequired: z.boolean(),
  isSearchable: z.boolean(),
  isSensitive: z.boolean(),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function errorState(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ParticipantFieldActionState {
  return { status: "error", message, fieldErrors };
}

function parseOptions(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\n;,]/)
        .map((option) => option.trim())
        .filter(Boolean),
    ),
  ];
}

function parseFieldForm(formData: FormData) {
  const parsed = fieldSchema.safeParse({
    label: readString(formData, "label"),
    fieldType: readString(formData, "fieldType"),
    options: readString(formData, "options"),
    isRequired: readBoolean(formData, "isRequired"),
    isSearchable: readBoolean(formData, "isSearchable"),
    isSensitive: readBoolean(formData, "isSensitive"),
  });

  if (!parsed.success) {
    return {
      error: errorState(
        "Check the highlighted field settings and try again.",
        parsed.error.flatten().fieldErrors,
      ),
    };
  }

  const options = parseOptions(parsed.data.options ?? "");
  const usesOptions = ["select", "multi_select"].includes(
    parsed.data.fieldType,
  );

  if (usesOptions && options.length < 1) {
    return {
      error: errorState("Add at least one available option.", {
        options: ["Choice fields need at least one option."],
      }),
    };
  }

  if (options.length > 30 || options.some((option) => option.length > 80)) {
    return {
      error: errorState("Review the available options.", {
        options: [
          "Use at most 30 unique options, with no more than 80 characters each.",
        ],
      }),
    };
  }

  return {
    data: {
      ...parsed.data,
      options: usesOptions ? options : [],
      isSearchable: parsed.data.isSensitive ? false : parsed.data.isSearchable,
    },
  };
}

async function clientDefinitions(clientId: string) {
  return getDb()
    .select({
      id: participantFieldDefinitions.id,
      fieldKey: participantFieldDefinitions.fieldKey,
      label: participantFieldDefinitions.label,
      fieldType: participantFieldDefinitions.fieldType,
      isActive: participantFieldDefinitions.isActive,
      displayOrder: participantFieldDefinitions.displayOrder,
    })
    .from(participantFieldDefinitions)
    .where(eq(participantFieldDefinitions.clientId, clientId));
}

function duplicateLabel(
  definitions: Awaited<ReturnType<typeof clientDefinitions>>,
  label: string,
  excludingId?: string,
) {
  const normalized = label.trim().toLocaleLowerCase("en-US");
  return definitions.some(
    (field) =>
      field.id !== excludingId &&
      field.label.trim().toLocaleLowerCase("en-US") === normalized,
  );
}

export async function createParticipantFieldAction(
  _previousState: ParticipantFieldActionState,
  formData: FormData,
): Promise<ParticipantFieldActionState> {
  void _previousState;
  const session = await requireClientSession();
  const parsed = parseFieldForm(formData);
  if (!parsed.data) return parsed.error!;

  const definitions = await clientDefinitions(session.clientId);
  if (definitions.filter((field) => field.isActive).length >= 25) {
    return errorState("A tenant can have up to 25 active custom fields.");
  }
  if (definitions.length >= 100) {
    return errorState(
      "This tenant has reached the participant field history limit. Restore an existing field instead.",
    );
  }

  if (duplicateLabel(definitions, parsed.data.label)) {
    return errorState("A participant field with that label already exists.", {
      label: ["Use a unique field label."],
    });
  }

  const baseKey = participantFieldKeyFromLabel(parsed.data.label);
  const existingKeys = new Set(definitions.map((field) => field.fieldKey));
  let fieldKey = baseKey;
  let suffix = 2;
  while (existingKeys.has(fieldKey)) {
    fieldKey = `${baseKey.slice(0, 58)}_${suffix}`;
    suffix += 1;
  }

  const displayOrder =
    definitions.reduce(
      (highest, field) => Math.max(highest, field.displayOrder),
      -1,
    ) + 1;

  const [created] = await getDb()
    .insert(participantFieldDefinitions)
    .values({
      clientId: session.clientId,
      fieldKey,
      label: parsed.data.label,
      fieldType: parsed.data.fieldType,
      options: parsed.data.options,
      isRequired: parsed.data.isRequired,
      isSearchable: parsed.data.isSearchable,
      isSensitive: parsed.data.isSensitive,
      displayOrder,
      createdByClientUserId: session.userId,
    })
    .returning({ id: participantFieldDefinitions.id })
    .catch(() => []);
  if (!created) {
    return errorState(
      "Participant field could not be added. Check for duplicate settings and try again.",
    );
  }

  revalidatePath("/dashboard/participants");
  return {
    status: "success",
    message: `${parsed.data.label} is now available on participant profiles.`,
  };
}

export async function updateParticipantFieldAction(
  fieldId: string,
  _previousState: ParticipantFieldActionState,
  formData: FormData,
): Promise<ParticipantFieldActionState> {
  void _previousState;
  const session = await requireClientSession();
  const id = z.string().uuid().safeParse(fieldId);
  if (!id.success) return errorState("Participant field is invalid.");

  const parsed = parseFieldForm(formData);
  if (!parsed.data) return parsed.error!;

  const definitions = await clientDefinitions(session.clientId);
  const existing = definitions.find((field) => field.id === id.data);
  if (!existing) return errorState("Participant field was not found.");
  if (existing.fieldType !== parsed.data.fieldType) {
    return errorState(
      "The field type cannot be changed after creation. Archive it and create a new field instead.",
    );
  }
  if (duplicateLabel(definitions, parsed.data.label, id.data)) {
    return errorState("A participant field with that label already exists.", {
      label: ["Use a unique field label."],
    });
  }

  const [updated] = await getDb()
    .update(participantFieldDefinitions)
    .set({
      label: parsed.data.label,
      options: parsed.data.options,
      isRequired: parsed.data.isRequired,
      isSearchable: parsed.data.isSearchable,
      isSensitive: parsed.data.isSensitive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(participantFieldDefinitions.clientId, session.clientId),
        eq(participantFieldDefinitions.id, id.data),
      ),
    )
    .returning({ id: participantFieldDefinitions.id })
    .catch(() => []);
  if (!updated) {
    return errorState("Participant field could not be updated.");
  }

  revalidatePath("/dashboard/participants");
  return { status: "success", message: "Participant field updated." };
}

export async function setParticipantFieldActiveAction(
  fieldId: string,
  makeActive: boolean,
  _previousState: ParticipantFieldActionState,
  _formData: FormData,
): Promise<ParticipantFieldActionState> {
  void _previousState;
  void _formData;
  const session = await requireClientSession();
  const id = z.string().uuid().safeParse(fieldId);
  if (!id.success) return errorState("Participant field is invalid.");

  const definitions = await clientDefinitions(session.clientId);
  const existing = definitions.find((field) => field.id === id.data);
  if (!existing) return errorState("Participant field was not found.");
  if (
    makeActive &&
    !existing.isActive &&
    definitions.filter((field) => field.isActive).length >= 25
  ) {
    return errorState("A tenant can have up to 25 active custom fields.");
  }

  const [updated] = await getDb()
    .update(participantFieldDefinitions)
    .set({ isActive: makeActive, updatedAt: new Date() })
    .where(
      and(
        eq(participantFieldDefinitions.clientId, session.clientId),
        eq(participantFieldDefinitions.id, id.data),
      ),
    )
    .returning({ id: participantFieldDefinitions.id })
    .catch(() => []);
  if (!updated) {
    return errorState("Participant field could not be updated.");
  }

  revalidatePath("/dashboard/participants");
  return {
    status: "success",
    message: makeActive
      ? "Participant field restored."
      : "Participant field archived. Existing values are preserved.",
  };
}

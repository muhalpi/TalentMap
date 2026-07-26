"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireClientSession } from "@/auth/guards";
import { getDb } from "@/db/client";
import { participants } from "@/db/schema";
import { anonymizeParticipant } from "@/services/participant-anonymization-service";
import {
  buildParticipantMetadata,
  getClientParticipantFieldDefinitions,
  parseParticipantCustomFieldFormData,
  parseParticipantTags,
  participantCustomFieldValues,
} from "@/services/participant-field-service";

export interface ParticipantActionState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
}

const idleState: ParticipantActionState = {
  status: "idle",
  message: "",
};

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }, z.string().max(max).optional());

const participantFormSchema = z.object({
  name: z.string().trim().min(2, "Participant name is required.").max(180),
  email: z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim().toLowerCase();
    return trimmed ? trimmed : undefined;
  }, z.string().email("Use a valid email.").max(180).optional()),
  employeeId: optionalText(120),
  externalReference: optionalText(120),
  tags: optionalText(240),
});

const anonymizeParticipantFormSchema = z.object({
  participantId: z.string().uuid("Participant identifier is invalid."),
  confirmation: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "ANONYMIZE", {
      message: "Type ANONYMIZE to confirm.",
    }),
  reason: optionalText(500),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validationState(
  error: z.ZodError | null,
  customFieldErrors: Record<string, string[]> = {},
): ParticipantActionState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: {
      ...(error?.flatten().fieldErrors ?? {}),
      ...customFieldErrors,
    },
  };
}

function errorState(message: string): ParticipantActionState {
  return {
    status: "error",
    message,
  };
}

export async function createParticipantAction(
  _previousState: ParticipantActionState = idleState,
  formData: FormData,
): Promise<ParticipantActionState> {
  void _previousState;
  const session = await requireClientSession();
  const definitions = await getClientParticipantFieldDefinitions(
    session.clientId,
  );
  const parsed = participantFormSchema.safeParse({
    name: readString(formData, "name"),
    email: readString(formData, "email"),
    employeeId: readString(formData, "employeeId"),
    externalReference: readString(formData, "externalReference"),
    tags: readString(formData, "tags"),
  });
  const customFields = parseParticipantCustomFieldFormData(
    definitions,
    formData,
  );

  if (!parsed.success || Object.keys(customFields.fieldErrors).length) {
    return validationState(
      parsed.success ? null : parsed.error,
      customFields.fieldErrors,
    );
  }

  const db = getDb();

  if (parsed.data.email) {
    const [emailConflict] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.clientId, session.clientId),
          eq(participants.email, parsed.data.email),
        ),
      )
      .limit(1);

    if (emailConflict) {
      return errorState("A participant with that email already exists.");
    }
  }

  if (parsed.data.employeeId) {
    const [employeeConflict] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.clientId, session.clientId),
          eq(participants.employeeId, parsed.data.employeeId),
        ),
      )
      .limit(1);

    if (employeeConflict) {
      return errorState("A participant with that identifier already exists.");
    }
  }

  if (parsed.data.externalReference) {
    const [referenceConflict] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.clientId, session.clientId),
          eq(participants.externalReference, parsed.data.externalReference),
        ),
      )
      .limit(1);

    if (referenceConflict) {
      return errorState(
        "A participant with that external reference already exists.",
      );
    }
  }

  const [created] = await db
    .insert(participants)
    .values({
      clientId: session.clientId,
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      employeeId: parsed.data.employeeId ?? null,
      externalReference: parsed.data.externalReference ?? null,
      metadata: buildParticipantMetadata(
        parseParticipantTags(parsed.data.tags ?? ""),
        customFields.values,
      ),
    })
    .returning({ id: participants.id })
    .catch(() => []);

  if (!created) {
    return errorState(
      "Participant could not be created. Check for duplicates.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/participants");
  redirect(`/dashboard/participants/${created.id}`);
}

export async function updateParticipantAction(
  participantId: string,
  _previousState: ParticipantActionState = idleState,
  formData: FormData,
): Promise<ParticipantActionState> {
  void _previousState;
  const session = await requireClientSession();
  const participantIdResult = z.string().uuid().safeParse(participantId);

  if (!participantIdResult.success) {
    return errorState("Participant identifier is invalid.");
  }

  const definitions = await getClientParticipantFieldDefinitions(
    session.clientId,
    { includeInactive: true },
  );
  const parsed = participantFormSchema.safeParse({
    name: readString(formData, "name"),
    email: readString(formData, "email"),
    employeeId: readString(formData, "employeeId"),
    externalReference: readString(formData, "externalReference"),
    tags: readString(formData, "tags"),
  });
  const customFields = parseParticipantCustomFieldFormData(
    definitions,
    formData,
  );

  if (!parsed.success || Object.keys(customFields.fieldErrors).length) {
    return validationState(
      parsed.success ? null : parsed.error,
      customFields.fieldErrors,
    );
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: participants.id, metadata: participants.metadata })
    .from(participants)
    .where(
      and(
        eq(participants.clientId, session.clientId),
        eq(participants.id, participantIdResult.data),
        ne(participants.status, "anonymized"),
        isNull(participants.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    return errorState("Participant was not found.");
  }

  if (parsed.data.email) {
    const [emailConflict] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.clientId, session.clientId),
          eq(participants.email, parsed.data.email),
          ne(participants.id, participantIdResult.data),
        ),
      )
      .limit(1);

    if (emailConflict) {
      return errorState("A participant with that email already exists.");
    }
  }

  if (parsed.data.employeeId) {
    const [employeeConflict] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.clientId, session.clientId),
          eq(participants.employeeId, parsed.data.employeeId),
          ne(participants.id, participantIdResult.data),
        ),
      )
      .limit(1);

    if (employeeConflict) {
      return errorState("A participant with that identifier already exists.");
    }
  }

  if (parsed.data.externalReference) {
    const [referenceConflict] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.clientId, session.clientId),
          eq(participants.externalReference, parsed.data.externalReference),
          ne(participants.id, participantIdResult.data),
        ),
      )
      .limit(1);

    if (referenceConflict) {
      return errorState(
        "A participant with that external reference already exists.",
      );
    }
  }

  const mergedCustomFields = participantCustomFieldValues(
    existing.metadata,
    definitions,
  );
  for (const definition of definitions.filter((field) => field.isActive)) {
    delete mergedCustomFields[definition.fieldKey];
  }
  Object.assign(mergedCustomFields, customFields.values);

  const [updated] = await db
    .update(participants)
    .set({
      name: parsed.data.name,
      email: parsed.data.email ?? null,
      employeeId: parsed.data.employeeId ?? null,
      externalReference: parsed.data.externalReference ?? null,
      metadata: buildParticipantMetadata(
        parseParticipantTags(parsed.data.tags ?? ""),
        mergedCustomFields,
      ),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(participants.clientId, session.clientId),
        eq(participants.id, participantIdResult.data),
        ne(participants.status, "anonymized"),
        isNull(participants.deletedAt),
      ),
    )
    .returning({ id: participants.id })
    .catch(() => []);

  if (!updated) {
    return errorState(
      "Participant could not be updated. Check for duplicates.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tokens");
  revalidatePath("/dashboard/results");
  revalidatePath("/dashboard/participants");
  revalidatePath(`/dashboard/participants/${participantIdResult.data}`);

  return {
    status: "success",
    message: "Participant profile updated.",
  };
}

export async function anonymizeParticipantAction(
  _previousState: ParticipantActionState = idleState,
  formData: FormData,
): Promise<ParticipantActionState> {
  void _previousState;
  const session = await requireClientSession();
  const parsed = anonymizeParticipantFormSchema.safeParse({
    participantId: readString(formData, "participantId"),
    confirmation: readString(formData, "confirmation"),
    reason: readString(formData, "reason"),
  });

  if (!parsed.success) {
    return validationState(parsed.error);
  }

  try {
    await anonymizeParticipant({
      clientId: session.clientId,
      participantId: parsed.data.participantId,
      requestedByClientUserId: session.userId,
      reason: parsed.data.reason ?? null,
    });
  } catch (error) {
    return errorState(
      error instanceof Error
        ? error.message
        : "Participant could not be anonymized.",
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tokens");
  revalidatePath("/dashboard/results");
  revalidatePath("/dashboard/participants");
  revalidatePath(`/dashboard/participants/${parsed.data.participantId}`);
  redirect("/dashboard/participants");
}

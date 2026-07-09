"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireInternalAdminSession } from "@/auth/guards";
import { getDb } from "@/db/client";
import {
  clientTestQuotas,
  clientUsers,
  clients,
  results,
  tests,
} from "@/db/schema";
import { getTestDefinition } from "@/tests/registry";
import type { TestKey } from "@/tests/shared/types";

export interface AdminActionState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
}

const idleState: AdminActionState = {
  status: "idle",
  message: "",
};

const testKeySchema = z.enum([
  "mbti",
  "kts2",
  "mmpi",
  "bfi",
  "sds",
  "papi",
  "disc",
]);

const clientStatusSchema = z.enum(["active", "suspended", "expired"]);

const clientFormSchema = z.object({
  name: z.string().trim().min(2, "Client name is required.").max(140),
  slug: z.string().trim().max(90).optional(),
  status: clientStatusSchema,
  contractStartsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  contractEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  clientAdminEmail: z
    .preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().email("Use a valid email.").max(180).optional(),
    )
    .optional(),
  clientAdminName: z.string().trim().max(140).optional(),
});

const entitlementFormSchema = z.object({
  testKey: testKeySchema,
  quotaTotal: z.coerce
    .number()
    .int("Quota must be a whole number.")
    .min(0, "Quota cannot be negative.")
    .max(100000, "Quota is too large."),
  quotaExpiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
    .optional()
    .or(z.literal("")),
});

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeSlug(value: string, fallback: string) {
  const source = value.trim() || fallback.trim();

  return source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function dateFromInput(value: string, endOfDay = false) {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  return date;
}

function validationState(error: z.ZodError): AdminActionState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: error.flatten().fieldErrors,
  };
}

function errorState(message: string): AdminActionState {
  return {
    status: "error",
    message,
  };
}

function parseClientForm(formData: FormData) {
  return clientFormSchema.safeParse({
    name: readString(formData, "name"),
    slug: readString(formData, "slug"),
    status: readString(formData, "status"),
    contractStartsAt: readString(formData, "contractStartsAt"),
    contractEndsAt: readString(formData, "contractEndsAt"),
    clientAdminEmail: readString(formData, "clientAdminEmail"),
    clientAdminName: readString(formData, "clientAdminName"),
  });
}

export async function createClientAction(
  _previousState: AdminActionState = idleState,
  formData: FormData,
): Promise<AdminActionState> {
  void _previousState;
  await requireInternalAdminSession();

  const parsed = parseClientForm(formData);

  if (!parsed.success) {
    return validationState(parsed.error);
  }

  const startsAt = dateFromInput(parsed.data.contractStartsAt);
  const endsAt = dateFromInput(parsed.data.contractEndsAt, true);

  if (endsAt.getTime() < startsAt.getTime()) {
    return errorState("Contract end date must be on or after the start date.");
  }

  const slug = normalizeSlug(parsed.data.slug ?? "", parsed.data.name);

  if (!slug) {
    return errorState("Slug must contain at least one letter or number.");
  }

  const db = getDb();
  const [slugConflict] = await db
    .select({ clientId: clients.clientId })
    .from(clients)
    .where(eq(clients.slug, slug))
    .limit(1);

  if (slugConflict) {
    return errorState("That client slug is already in use.");
  }

  const [created] = await db
    .insert(clients)
    .values({
      name: parsed.data.name,
      slug,
      status: parsed.data.status,
      contractStartsAt: startsAt,
      contractEndsAt: endsAt,
    })
    .returning({ clientId: clients.clientId });

  if (parsed.data.clientAdminEmail) {
    await db.insert(clientUsers).values({
      clientId: created.clientId,
      email: parsed.data.clientAdminEmail,
      name: parsed.data.clientAdminName || null,
      role: "client_admin",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${created.clientId}`);
}

export async function updateClientContractAction(
  clientId: string,
  _previousState: AdminActionState = idleState,
  formData: FormData,
): Promise<AdminActionState> {
  void _previousState;
  await requireInternalAdminSession();

  const parsed = parseClientForm(formData);

  if (!parsed.success) {
    return validationState(parsed.error);
  }

  const startsAt = dateFromInput(parsed.data.contractStartsAt);
  const endsAt = dateFromInput(parsed.data.contractEndsAt, true);

  if (endsAt.getTime() < startsAt.getTime()) {
    return errorState("Contract end date must be on or after the start date.");
  }

  const slug = normalizeSlug(parsed.data.slug ?? "", parsed.data.name);

  if (!slug) {
    return errorState("Slug must contain at least one letter or number.");
  }

  const db = getDb();
  const [slugConflict] = await db
    .select({ clientId: clients.clientId })
    .from(clients)
    .where(eq(clients.slug, slug))
    .limit(1);

  if (slugConflict && slugConflict.clientId !== clientId) {
    return errorState("That client slug is already in use.");
  }

  const [updated] = await db
    .update(clients)
    .set({
      name: parsed.data.name,
      slug,
      status: parsed.data.status,
      contractStartsAt: startsAt,
      contractEndsAt: endsAt,
      updatedAt: new Date(),
    })
    .where(eq(clients.clientId, clientId))
    .returning({ clientId: clients.clientId });

  if (!updated) {
    return errorState("Client was not found.");
  }

  await db
    .update(results)
    .set({
      retentionUntil: endsAt,
      ...(endsAt.getTime() > Date.now()
        ? { retentionStatus: "active" as const }
        : {}),
    })
    .where(
      and(
        eq(results.clientId, clientId),
        ne(results.retentionStatus, "deleted"),
      ),
    );

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/retention");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/results");

  return {
    status: "success",
    message: "Client contract settings saved.",
  };
}

export async function updateClientEntitlementAction(
  clientId: string,
  _previousState: AdminActionState = idleState,
  formData: FormData,
): Promise<AdminActionState> {
  void _previousState;
  await requireInternalAdminSession();

  const parsed = entitlementFormSchema.safeParse({
    testKey: readString(formData, "testKey"),
    quotaTotal: readString(formData, "quotaTotal"),
    quotaExpiresAt: readString(formData, "quotaExpiresAt"),
  });

  if (!parsed.success) {
    return validationState(parsed.error);
  }

  const definition = getTestDefinition(parsed.data.testKey);

  if (!definition) {
    return errorState("Selected test was not found in the registry.");
  }

  const requestedEnabled = formData.get("isEnabled") === "on";
  const isEnabled = requestedEnabled && definition.implemented;
  const quotaExpiresAt = parsed.data.quotaExpiresAt
    ? dateFromInput(parsed.data.quotaExpiresAt, true)
    : null;

  const db = getDb();
  const [client] = await db
    .select({ clientId: clients.clientId })
    .from(clients)
    .where(eq(clients.clientId, clientId))
    .limit(1);

  if (!client) {
    return errorState("Client was not found.");
  }

  const [existingTest] = await db
    .select()
    .from(tests)
    .where(
      and(
        eq(tests.clientId, clientId),
        eq(tests.testKey, parsed.data.testKey),
        eq(tests.version, definition.version),
      ),
    )
    .limit(1);

  const testRow =
    existingTest ??
    (
      await db
        .insert(tests)
        .values({
          clientId,
          testKey: parsed.data.testKey satisfies TestKey,
          displayName: definition.name,
          version: definition.version,
          isEnabled,
        })
        .returning()
    )[0];

  if (existingTest) {
    await db
      .update(tests)
      .set({
        displayName: definition.name,
        version: definition.version,
        isEnabled,
      })
      .where(and(eq(tests.id, existingTest.id), eq(tests.clientId, clientId)));
  }

  const [existingQuota] = await db
    .select()
    .from(clientTestQuotas)
    .where(
      and(
        eq(clientTestQuotas.clientId, clientId),
        eq(clientTestQuotas.testId, testRow.id),
      ),
    )
    .limit(1);

  const allocatedQuota = existingQuota
    ? existingQuota.quotaReserved + existingQuota.quotaConsumed
    : 0;

  if (existingQuota && parsed.data.quotaTotal < allocatedQuota) {
    return errorState(
      `Quota cannot be lower than the ${allocatedQuota} allocated slots.`,
    );
  }

  if (existingQuota) {
    await db
      .update(clientTestQuotas)
      .set({
        quotaTotal: parsed.data.quotaTotal,
        quotaExpiresAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clientTestQuotas.id, existingQuota.id),
          eq(clientTestQuotas.clientId, clientId),
        ),
      );
  } else {
    await db.insert(clientTestQuotas).values({
      clientId,
      testId: testRow.id,
      quotaTotal: parsed.data.quotaTotal,
      quotaUsed: 0,
      quotaReserved: 0,
      quotaConsumed: 0,
      quotaExpiresAt,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/tokens");

  return {
    status: "success",
    message:
      requestedEnabled && !definition.implemented
        ? "Entitlement saved as disabled until this instrument is adapted."
        : "Entitlement saved.",
  };
}

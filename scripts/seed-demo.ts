import { config } from "dotenv";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "../src/db/client";
import {
  clientTestQuotas,
  clientUsers,
  clients,
  internalAdminUsers,
  participantFieldDefinitions,
  participants,
  participantTokens,
  tests,
} from "../src/db/schema";
import {
  generateClientParticipantAccess,
  reissueClientParticipantAccess,
} from "../src/services/token-service";
import { bfiDefinition } from "../src/tests/instruments/bfi/definition";
import { mbtiDefinition } from "../src/tests/instruments/mbti/definition";
import type { TestDefinition } from "../src/tests/shared/types";

config({ path: ".env.local" });

function requiredDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid seed date: ${value}`);
  }

  return date;
}

function firstAdminEmail() {
  return (
    process.env.INTERNAL_ADMIN_EMAILS?.split(",")
      .map((email) => email.trim())
      .find(Boolean) ?? "admin@example.com"
  );
}

async function getOrCreateClient() {
  const db = getDb();
  const slug = "northstar-advisory";
  const [existing] = await db
    .select()
    .from(clients)
    .where(eq(clients.slug, slug))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(clients)
    .values({
      name: "Northstar Advisory",
      slug,
      contractStartsAt: requiredDate("2026-01-01T00:00:00.000Z"),
      contractEndsAt: requiredDate("2027-03-31T23:59:59.000Z"),
    })
    .returning();

  return created;
}

async function getOrCreateClientUser(clientId: string) {
  const db = getDb();
  const email = "admin@northstar.example";
  const [existing] = await db
    .select()
    .from(clientUsers)
    .where(
      and(eq(clientUsers.clientId, clientId), eq(clientUsers.email, email)),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(clientUsers)
    .values({
      clientId,
      email,
      name: "Northstar Admin",
      role: "client_admin",
    })
    .returning();

  return created;
}

async function getOrCreateTest(clientId: string, definition: TestDefinition) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(tests)
    .where(
      and(
        eq(tests.clientId, clientId),
        eq(tests.testKey, definition.key),
        eq(tests.version, definition.version),
      ),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(tests)
    .values({
      clientId,
      testKey: definition.key,
      displayName: definition.name,
      version: definition.version,
      isEnabled: true,
    })
    .returning();

  return created;
}

async function ensureQuota(clientId: string, testId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(clientTestQuotas)
    .where(
      and(
        eq(clientTestQuotas.clientId, clientId),
        eq(clientTestQuotas.testId, testId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(clientTestQuotas)
      .set({
        quotaTotal: Math.max(existing.quotaTotal, 250),
        quotaExpiresAt: requiredDate("2027-03-31T23:59:59.000Z"),
        updatedAt: new Date(),
      })
      .where(eq(clientTestQuotas.id, existing.id));
    return;
  }

  await db.insert(clientTestQuotas).values({
    clientId,
    testId,
    quotaTotal: 250,
    quotaUsed: 0,
    quotaReserved: 0,
    quotaConsumed: 0,
    quotaExpiresAt: requiredDate("2027-03-31T23:59:59.000Z"),
  });
}

async function getOrCreateSeedParticipant(clientId: string) {
  const db = getDb();
  const email = "participant@example.com";
  const [existing] = await db
    .select()
    .from(participants)
    .where(
      and(eq(participants.clientId, clientId), eq(participants.email, email)),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(participants)
    .values({
      clientId,
      name: "Demo Participant",
      email,
      employeeId: "TM-DEMO-001",
      metadata: {
        tags: ["demo", "2026 intake"],
        customFields: {
          program: "Leadership Development",
          cohort: "Cohort A",
        },
      },
    })
    .returning();

  return created;
}

async function ensureParticipantFields(clientId: string, clientUserId: string) {
  const db = getDb();
  await db
    .insert(participantFieldDefinitions)
    .values([
      {
        clientId,
        fieldKey: "program",
        label: "Program",
        fieldType: "text",
        displayOrder: 0,
        createdByClientUserId: clientUserId,
      },
      {
        clientId,
        fieldKey: "cohort",
        label: "Cohort",
        fieldType: "select",
        options: ["Cohort A", "Cohort B", "Cohort C"],
        displayOrder: 1,
        createdByClientUserId: clientUserId,
      },
      {
        clientId,
        fieldKey: "phone",
        label: "Phone",
        fieldType: "phone",
        isSearchable: false,
        isSensitive: true,
        displayOrder: 2,
        createdByClientUserId: clientUserId,
      },
    ])
    .onConflictDoNothing();
}

async function seed() {
  const db = getDb();
  const adminEmail = firstAdminEmail();

  await db
    .insert(internalAdminUsers)
    .values({
      email: adminEmail,
      name: "Internal Admin",
      role: "owner",
    })
    .onConflictDoNothing();

  const client = await getOrCreateClient();
  const clientUser = await getOrCreateClientUser(client.clientId);
  await ensureParticipantFields(client.clientId, clientUser.id);
  const participant = await getOrCreateSeedParticipant(client.clientId);
  const definitions = [mbtiDefinition, bfiDefinition];
  const seededTests = [];

  for (const definition of definitions) {
    const test = await getOrCreateTest(client.clientId, definition);
    await ensureQuota(client.clientId, test.id);
    seededTests.push(test);
  }

  const test = seededTests[0];

  if (!test) {
    throw new Error("No implemented assessments were seeded.");
  }

  const [liveAssignment] = await db
    .select({ id: participantTokens.id })
    .from(participantTokens)
    .where(
      and(
        eq(participantTokens.clientId, client.clientId),
        eq(participantTokens.participantId, participant.id),
        eq(participantTokens.testKey, test.testKey),
        inArray(participantTokens.status, ["active", "in_progress"]),
      ),
    )
    .limit(1);
  const generated = liveAssignment
    ? await reissueClientParticipantAccess({
        clientId: client.clientId,
        tokenId: liveAssignment.id,
        requestedByClientUserId: clientUser.id,
      })
    : await generateClientParticipantAccess({
        clientId: client.clientId,
        testId: test.id,
        createdByClientUserId: clientUser.id,
        participantId: participant.id,
      });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  console.log(
    JSON.stringify(
      {
        internalAdminEmail: adminEmail,
        client: client.name,
        clientId: client.clientId,
        tests: seededTests.map((seededTest) => ({
          key: seededTest.testKey,
          name: seededTest.displayName,
          version: seededTest.version,
          testId: seededTest.id,
        })),
        assessmentUrl: `${appUrl}${generated.accessPath}`,
        accessCode: generated.accessCode,
        accessExpiresAt: generated.expiresAt.toISOString(),
      },
      null,
      2,
    ),
  );
}

seed().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

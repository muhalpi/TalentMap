import { config } from "dotenv";
import { and, eq } from "drizzle-orm";

import { getDb } from "../src/db/client";
import {
  clientTestQuotas,
  clientUsers,
  clients,
  internalAdminUsers,
  tests,
} from "../src/db/schema";
import { generateClientParticipantToken } from "../src/services/token-service";
import { mbtiDefinition } from "../src/tests/instruments/mbti/definition";

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
    .where(and(eq(clientUsers.clientId, clientId), eq(clientUsers.email, email)))
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

async function getOrCreateMbtiTest(clientId: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(tests)
    .where(
      and(
        eq(tests.clientId, clientId),
        eq(tests.testKey, mbtiDefinition.key),
        eq(tests.version, mbtiDefinition.version),
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
      testKey: mbtiDefinition.key,
      displayName: mbtiDefinition.name,
      version: mbtiDefinition.version,
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
  const test = await getOrCreateMbtiTest(client.clientId);
  await ensureQuota(client.clientId, test.id);

  const generated = await generateClientParticipantToken({
    clientId: client.clientId,
    testId: test.id,
    createdByClientUserId: clientUser.id,
    participantReference: `seed-${Date.now()}`,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  console.log(
    JSON.stringify(
      {
        internalAdminEmail: adminEmail,
        client: client.name,
        clientId: client.clientId,
        test: test.displayName,
        testId: test.id,
        participantUrl: `${appUrl}${generated.urlPath}`,
        tokenExpiresAt: generated.expiresAt.toISOString(),
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

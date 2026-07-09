import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { clientUsers, clients, internalAdminUsers } from "@/db/schema";
import { encodeSession } from "@/auth/session";

const DEFAULT_DEMO_CLIENT_SLUG = "northstar-advisory";

function demoSlug() {
  return process.env.DEMO_CLIENT_SLUG ?? DEFAULT_DEMO_CLIENT_SLUG;
}

function firstConfiguredAdminEmail() {
  return process.env.INTERNAL_ADMIN_EMAILS?.split(",")
    .map((email) => email.trim())
    .find(Boolean);
}

export async function createInternalAdminSessionToken() {
  const db = getDb();
  const configuredEmail = firstConfiguredAdminEmail();
  const query = configuredEmail
    ? db
        .select()
        .from(internalAdminUsers)
        .where(eq(internalAdminUsers.email, configuredEmail))
        .limit(1)
    : db.select().from(internalAdminUsers).limit(1);

  const [admin] = await query;

  if (!admin) {
    throw new Error("No internal admin has been seeded.");
  }

  return encodeSession({
    role: "internal_admin",
    userId: admin.id,
    email: admin.email,
  });
}

export async function createClientSessionToken() {
  const db = getDb();
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.slug, demoSlug()))
    .limit(1);

  if (!client) {
    throw new Error("Demo client has not been seeded.");
  }

  const [user] = await db
    .select()
    .from(clientUsers)
    .where(eq(clientUsers.clientId, client.clientId))
    .limit(1);

  if (!user) {
    throw new Error("Demo client user has not been seeded.");
  }

  return encodeSession({
    role: "client",
    userId: user.id,
    email: user.email,
    clientId: client.clientId,
  });
}

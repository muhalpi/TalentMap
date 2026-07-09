import { createHmac, timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db/client";
import { clientUsers, clients, internalAdminUsers } from "@/db/schema";

const SESSION_COOKIE = "tm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionRole = "internal_admin" | "client";

export interface SessionPayload {
  role: SessionRole;
  userId: string;
  email: string;
  clientId?: string;
  expiresAt: number;
}

export interface InternalAdminSession extends SessionPayload {
  role: "internal_admin";
}

export interface ClientSession extends SessionPayload {
  role: "client";
  clientId: string;
}

function sessionSecret() {
  const secret = process.env.AUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  return "talentmap-local-development-secret";
}

function base64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string) {
  const expected = sign(value);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function encodeSession(payload: Omit<SessionPayload, "expiresAt">) {
  const session: SessionPayload = {
    ...payload,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64Url(JSON.stringify(session));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function decodeSession(value: string): SessionPayload | null {
  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature || !verifySignature(encodedPayload, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;

    if (payload.expiresAt <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (payload.role === "client" && !payload.clientId) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;

  if (!value) {
    return null;
  }

  return decodeSession(value);
}

export async function getInternalAdminSession() {
  const session = await getSession();

  if (session?.role !== "internal_admin") {
    return null;
  }

  const db = getDb();
  const [admin] = await db
    .select()
    .from(internalAdminUsers)
    .where(
      and(
        eq(internalAdminUsers.id, session.userId),
        eq(internalAdminUsers.email, session.email),
      ),
    )
    .limit(1);

  if (!admin) {
    return null;
  }

  return session as InternalAdminSession;
}

export async function getClientSession() {
  const session = await getSession();

  if (session?.role !== "client" || !session.clientId) {
    return null;
  }

  const db = getDb();
  const [user] = await db
    .select({
      userId: clientUsers.id,
      email: clientUsers.email,
      clientId: clientUsers.clientId,
      clientStatus: clients.status,
    })
    .from(clientUsers)
    .innerJoin(clients, eq(clients.clientId, clientUsers.clientId))
    .where(
      and(
        eq(clientUsers.id, session.userId),
        eq(clientUsers.email, session.email),
        eq(clientUsers.clientId, session.clientId),
      ),
    )
    .limit(1);

  if (!user || user.clientStatus !== "active") {
    return null;
  }

  return session as ClientSession;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function expiredSessionCookieOptions() {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  };
}

export { SESSION_COOKIE };

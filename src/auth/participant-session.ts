import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import {
  isDemoTestKey,
  type DemoTestKey,
} from "@/lib/demo-test-token";

export const PARTICIPANT_SESSION_COOKIE = "tm_participant_session";
const PARTICIPANT_SESSION_TTL_SECONDS = 60 * 60 * 12;

export type ParticipantSessionAccess =
  | {
      kind: "assignment";
      assignmentId: string;
      accessVersion: number;
    }
  | {
      kind: "demo";
      demoKey: DemoTestKey;
    };

interface ParticipantSessionPayload {
  access: ParticipantSessionAccess;
  expiresAt: number;
}

function participantSessionSecret() {
  const secret =
    process.env.PARTICIPANT_SESSION_SECRET ?? process.env.AUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PARTICIPANT_SESSION_SECRET or AUTH_SECRET is required in production.",
    );
  }

  return "talentmap-local-development-secret";
}

function sign(value: string) {
  return createHmac("sha256", participantSessionSecret())
    .update(value)
    .digest("base64url");
}

function validSignature(value: string, signature: string) {
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signature);

  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

function validAccess(value: unknown): value is ParticipantSessionAccess {
  if (!value || typeof value !== "object") {
    return false;
  }

  const access = value as Record<string, unknown>;

  if (access.kind === "demo") {
    return (
      typeof access.demoKey === "string" && isDemoTestKey(access.demoKey)
    );
  }

  return (
    access.kind === "assignment" &&
    typeof access.assignmentId === "string" &&
    access.assignmentId.length > 0 &&
    typeof access.accessVersion === "number" &&
    Number.isInteger(access.accessVersion) &&
    access.accessVersion > 0
  );
}

export function encodeParticipantSession(access: ParticipantSessionAccess) {
  const payload: ParticipantSessionPayload = {
    access,
    expiresAt:
      Math.floor(Date.now() / 1000) + PARTICIPANT_SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function decodeParticipantSession(
  value: string,
): ParticipantSessionAccess | null {
  const [encodedPayload, signature] = value.split(".");

  if (
    !encodedPayload ||
    !signature ||
    !validSignature(encodedPayload, signature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<ParticipantSessionPayload>;

    if (
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000) ||
      !validAccess(payload.access)
    ) {
      return null;
    }

    return payload.access;
  } catch {
    return null;
  }
}

export async function getParticipantSession() {
  const value = (await cookies()).get(PARTICIPANT_SESSION_COOKIE)?.value;

  return value ? decodeParticipantSession(value) : null;
}

export function participantSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PARTICIPANT_SESSION_TTL_SECONDS,
    priority: "high" as const,
  };
}

export function expiredParticipantSessionCookieOptions() {
  return {
    ...participantSessionCookieOptions(),
    maxAge: 0,
  };
}

export function participantAccessRateLimitKey(access: ParticipantSessionAccess) {
  return access.kind === "demo"
    ? `demo-${access.demoKey}`
    : access.assignmentId;
}

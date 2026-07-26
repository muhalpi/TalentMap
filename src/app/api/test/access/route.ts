import { NextResponse } from "next/server";
import { z } from "zod";

import {
  encodeParticipantSession,
  expiredParticipantSessionCookieOptions,
  PARTICIPANT_SESSION_COOKIE,
  participantSessionCookieOptions,
  type ParticipantSessionAccess,
} from "@/auth/participant-session";
import { isDemoTestKey } from "@/lib/demo-test-token";
import { getParticipantTestContext } from "@/services/participant-service";
import {
  enforceParticipantAccessRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";
import { rateLimitJson } from "@/app/api/test/rate-limit-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accessSchema = z.object({
  accessCode: z.string().trim().min(6).max(80),
});

function isAvailable(
  context: NonNullable<Awaited<ReturnType<typeof getParticipantTestContext>>>,
) {
  if (
    context.token.status !== "active" &&
    context.token.status !== "in_progress"
  ) {
    return false;
  }

  return (
    context.demo ||
    Boolean(
      context.participant &&
        context.participant.status === "active" &&
        !context.participant.deletedAt,
    )
  );
}

// Demo contexts are only built from the demo token map, so the narrowing below
// always succeeds today. Returning null instead of casting means a future
// instrument that gains a demo context without a demo token entry is refused
// rather than silently stored under a key the session decoder will reject.
function sessionAccess(
  context: NonNullable<Awaited<ReturnType<typeof getParticipantTestContext>>>,
): ParticipantSessionAccess | null {
  if (context.demo) {
    return isDemoTestKey(context.test.key)
      ? { kind: "demo", demoKey: context.test.key }
      : null;
  }

  return {
    kind: "assignment",
    assignmentId: context.token.id,
    accessVersion: context.token.accessVersion,
  };
}

export async function POST(request: Request) {
  try {
    const { accessCode } = accessSchema.parse(await request.json());

    await enforceParticipantAccessRateLimit({
      accessCode,
      headers: request.headers,
    });

    const context = await getParticipantTestContext(accessCode);
    const access =
      context && isAvailable(context) ? sessionAccess(context) : null;

    if (!access) {
      return NextResponse.json(
        { error: "That access code is invalid or unavailable." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );

    response.cookies.set(
      PARTICIPANT_SESSION_COOKIE,
      encodeParticipantSession(access),
      participantSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return rateLimitJson(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Enter a valid access code."
            : "Unable to verify assessment access.",
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set(
    PARTICIPANT_SESSION_COOKIE,
    "",
    expiredParticipantSessionCookieOptions(),
  );

  return response;
}

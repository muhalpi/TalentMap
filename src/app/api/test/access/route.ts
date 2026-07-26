import { NextResponse } from "next/server";
import { z } from "zod";

import {
  encodeParticipantSession,
  expiredParticipantSessionCookieOptions,
  PARTICIPANT_SESSION_COOKIE,
  participantSessionCookieOptions,
  type ParticipantSessionAccess,
} from "@/auth/participant-session";
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

function sessionAccess(
  context: NonNullable<Awaited<ReturnType<typeof getParticipantTestContext>>>,
): ParticipantSessionAccess {
  return context.demo
    ? { kind: "demo", demoKey: context.test.key as "mbti" | "bfi" }
    : {
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

    if (!context || !isAvailable(context)) {
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
    const access = sessionAccess(context);

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

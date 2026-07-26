import { NextResponse } from "next/server";

import {
  encodeParticipantSession,
  PARTICIPANT_SESSION_COOKIE,
  participantSessionCookieOptions,
  type ParticipantSessionAccess,
} from "@/auth/participant-session";
import { isDemoTestKey } from "@/lib/demo-test-token";
import { getParticipantTestContext } from "@/services/participant-service";
import {
  enforceInvalidTokenRateLimit,
  enforceTestTokenRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToEntry(request: Request, error?: "invalid" | "rate_limited") {
  const url = new URL("/test", request.url);

  if (error) {
    url.searchParams.set("error", error);
  }

  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    await enforceTestTokenRateLimit({
      rawToken: token,
      headers: request.headers,
      scope: "test_page",
    });

    const participantContext = await getParticipantTestContext(token);
    // Demo contexts are only built from the demo token map, so this narrowing
    // always succeeds today. Deriving the key instead of casting means a future
    // instrument that gains a demo context without a demo token entry is
    // treated as an invalid token rather than stored under a key the session
    // decoder will reject on the next request.
    const demoKey =
      participantContext?.demo && isDemoTestKey(participantContext.test.key)
        ? participantContext.test.key
        : null;
    const participantAvailable = Boolean(
      participantContext &&
        (participantContext.token.status === "active" ||
          participantContext.token.status === "in_progress") &&
        (demoKey !== null ||
          (participantContext.participant?.status === "active" &&
            !participantContext.participant.deletedAt)),
    );

    if (!participantContext || !participantAvailable) {
      await enforceInvalidTokenRateLimit({
        rawToken: token,
        headers: request.headers,
      });
      return redirectToEntry(request, "invalid");
    }

    const access: ParticipantSessionAccess = demoKey
      ? {
          kind: "demo",
          demoKey,
        }
      : {
          kind: "assignment",
          assignmentId: participantContext.token.id,
          accessVersion: participantContext.token.accessVersion,
        };
    const response = redirectToEntry(request);

    response.cookies.set(
      PARTICIPANT_SESSION_COOKIE,
      encodeParticipantSession(access),
      participantSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return redirectToEntry(request, "rate_limited");
    }

    throw error;
  }
}

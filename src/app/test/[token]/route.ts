import { NextResponse } from "next/server";

import {
  encodeParticipantSession,
  PARTICIPANT_SESSION_COOKIE,
  participantSessionCookieOptions,
  type ParticipantSessionAccess,
} from "@/auth/participant-session";
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
    const participantAvailable = Boolean(
      participantContext &&
        (participantContext.token.status === "active" ||
          participantContext.token.status === "in_progress") &&
        (participantContext.demo ||
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

    const access: ParticipantSessionAccess = participantContext.demo
      ? {
          kind: "demo",
          demoKey: participantContext.test.key as "mbti" | "bfi",
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

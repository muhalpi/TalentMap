import { NextResponse } from "next/server";

import { rateLimitJson } from "@/app/api/test/rate-limit-response";
import { startParticipantToken } from "@/services/participant-service";
import {
  enforceInvalidTokenRateLimit,
  enforceTestTokenRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    await enforceTestTokenRateLimit({
      rawToken: token,
      headers: request.headers,
      scope: "test_api_start",
    });
    const participantContext = await startParticipantToken(token);

    if (!participantContext) {
      try {
        await enforceInvalidTokenRateLimit({
          rawToken: token,
          headers: request.headers,
        });
      } catch (rateLimitError) {
        if (rateLimitError instanceof RateLimitExceededError) {
          return rateLimitJson(rateLimitError);
        }

        throw rateLimitError;
      }

      return NextResponse.json(
        { error: "Invalid participant token." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: participantContext.token.status,
      expiresAt: participantContext.token.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return rateLimitJson(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start participant token.",
      },
      { status: 400 },
    );
  }
}

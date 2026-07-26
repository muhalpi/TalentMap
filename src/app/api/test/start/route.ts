import { NextResponse } from "next/server";

import {
  getParticipantRequestAccess,
  participantSessionRequiredResponse,
} from "@/app/api/test/participant-request";
import { rateLimitJson } from "@/app/api/test/rate-limit-response";
import { startParticipantToken } from "@/services/participant-service";
import { RateLimitExceededError } from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const access = await getParticipantRequestAccess(request, "test_api_start");

    if (!access) {
      return participantSessionRequiredResponse();
    }

    const participantContext = await startParticipantToken(access);

    if (!participantContext) {
      return participantSessionRequiredResponse();
    }

    return NextResponse.json({
      status: participantContext.token.status,
      startedAt:
        participantContext.token.startedAt?.toISOString() ??
        new Date().toISOString(),
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
            : "Unable to start the assessment.",
      },
      { status: 400 },
    );
  }
}

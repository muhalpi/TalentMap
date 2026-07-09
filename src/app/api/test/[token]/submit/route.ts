import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInvalidParticipantTokenError,
  rateLimitJson,
} from "@/app/api/test/rate-limit-response";
import { submitParticipantResult } from "@/services/participant-service";
import {
  enforceInvalidTokenRateLimit,
  enforceTestTokenRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    await enforceTestTokenRateLimit({
      rawToken: token,
      headers: request.headers,
      scope: "test_api_submit",
    });
    const body = submitSchema.parse(await request.json());
    const result = await submitParticipantResult(token, body.answers);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return rateLimitJson(error);
    }

    if (isInvalidParticipantTokenError(error)) {
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
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit participant result.",
      },
      { status: 400 },
    );
  }
}

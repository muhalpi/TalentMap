import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getParticipantRequestAccess,
  participantSessionRequiredResponse,
} from "@/app/api/test/participant-request";
import {
  isInvalidParticipantAccessError,
  rateLimitJson,
} from "@/app/api/test/rate-limit-response";
import { submitParticipantResult } from "@/services/participant-service";
import { RateLimitExceededError } from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const submitSchema = z.object({
  answers: z.record(z.string(), z.string()),
  questionTimings: z
    .record(z.string(), z.number().int().min(0).max(86_400))
    .default({}),
});

export async function POST(request: Request) {
  try {
    const access = await getParticipantRequestAccess(
      request,
      "test_api_submit",
    );

    if (!access) {
      return participantSessionRequiredResponse();
    }

    const body = submitSchema.parse(await request.json());
    const result = await submitParticipantResult(
      access,
      body.answers,
      body.questionTimings,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return rateLimitJson(error);
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit participant result.",
      },
      { status: isInvalidParticipantAccessError(error) ? 401 : 400 },
    );
  }
}

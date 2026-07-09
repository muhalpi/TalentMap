import { NextResponse } from "next/server";

import {
  rateLimitResponseHeaders,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

export function rateLimitJson(error: RateLimitExceededError) {
  return NextResponse.json(
    { error: error.message },
    {
      status: 429,
      headers: rateLimitResponseHeaders(error),
    },
  );
}

export function isInvalidParticipantTokenError(error: unknown) {
  return (
    error instanceof Error &&
    error.message === "The participant token is invalid."
  );
}

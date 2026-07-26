import { NextResponse } from "next/server";

import {
  getParticipantSession,
  participantAccessRateLimitKey,
} from "@/auth/participant-session";
import {
  enforceTestTokenRateLimit,
  type TestRateLimitScope,
} from "@/services/test-rate-limit-service";

export async function getParticipantRequestAccess(
  request: Request,
  scope: Extract<
    TestRateLimitScope,
    | "test_api_consent"
    | "test_api_start"
    | "test_api_draft"
    | "test_api_submit"
  >,
) {
  const access = await getParticipantSession();

  if (!access) {
    return null;
  }

  await enforceTestTokenRateLimit({
    rawToken: participantAccessRateLimitKey(access),
    headers: request.headers,
    scope,
  });

  return access;
}

export function participantSessionRequiredResponse() {
  return NextResponse.json(
    { error: "Enter your access code to continue." },
    {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

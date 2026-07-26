import { createHmac } from "node:crypto";

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
import { acceptParticipantConsent } from "@/services/participant-service";
import { RateLimitExceededError } from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const consentSchema = z.object({
  accepted: z.literal(true),
});

function consentHashSecret() {
  return (
    process.env.CONSENT_HASH_SECRET ??
    process.env.AUTH_SECRET ??
    "talentmap-local-development-secret"
  );
}

function clientIp(request: Request) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    forwarded ??
    null
  );
}

function hashIp(ipAddress: string | null) {
  if (!ipAddress) {
    return null;
  }

  return createHmac("sha256", consentHashSecret())
    .update(ipAddress, "utf8")
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const access = await getParticipantRequestAccess(
      request,
      "test_api_consent",
    );

    if (!access) {
      return participantSessionRequiredResponse();
    }

    consentSchema.parse(await request.json());
    const consent = await acceptParticipantConsent(access, {
      ipHash: hashIp(clientIp(request)),
      userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    return NextResponse.json({
      acceptedAt: consent.acceptedAt.toISOString(),
      consentVersion: consent.consentVersion,
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
            : "Unable to record participant consent.",
      },
      { status: isInvalidParticipantAccessError(error) ? 401 : 400 },
    );
  }
}

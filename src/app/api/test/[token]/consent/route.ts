import { createHmac } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInvalidParticipantTokenError,
  rateLimitJson,
} from "@/app/api/test/rate-limit-response";
import { acceptParticipantConsent } from "@/services/participant-service";
import {
  enforceInvalidTokenRateLimit,
  enforceTestTokenRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

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

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    await enforceTestTokenRateLimit({
      rawToken: token,
      headers: request.headers,
      scope: "test_api_consent",
    });
    consentSchema.parse(await request.json());

    const consent = await acceptParticipantConsent(token, {
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
            : "Unable to record participant consent.",
      },
      { status: 400 },
    );
  }
}

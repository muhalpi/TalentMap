import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInvalidParticipantTokenError,
  rateLimitJson,
} from "@/app/api/test/rate-limit-response";
import {
  clearParticipantAnswerDraft,
  getParticipantAnswerDraft,
  saveParticipantAnswerDraft,
} from "@/services/participant-service";
import {
  enforceInvalidTokenRateLimit,
  enforceTestTokenRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const draftSchema = z.object({
  answers: z.record(z.string(), z.string()),
  currentQuestionIndex: z.number().int().min(0).default(0),
});

function draftResponse(
  draft: Awaited<ReturnType<typeof getParticipantAnswerDraft>>,
) {
  return {
    draft: draft
      ? {
          answers: draft.answers,
          currentQuestionIndex: draft.currentQuestionIndex,
          updatedAt: draft.updatedAt.toISOString(),
        }
      : null,
  };
}

async function enforceDraftRateLimit(token: string, request: Request) {
  await enforceTestTokenRateLimit({
    rawToken: token,
    headers: request.headers,
    scope: "test_api_draft",
  });
}

async function maybeRateLimitInvalidToken(
  token: string,
  request: Request,
  error: unknown,
) {
  if (!isInvalidParticipantTokenError(error)) {
    return null;
  }

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

  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    await enforceDraftRateLimit(token, request);
    const draft = await getParticipantAnswerDraft(token);
    return NextResponse.json(draftResponse(draft));
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return rateLimitJson(error);
    }

    const rateLimitResponse = await maybeRateLimitInvalidToken(
      token,
      request,
      error,
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load draft answers.",
      },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    await enforceDraftRateLimit(token, request);
    const body = draftSchema.parse(await request.json());
    const draft = await saveParticipantAnswerDraft(token, body);
    return NextResponse.json(draftResponse(draft));
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return rateLimitJson(error);
    }

    const rateLimitResponse = await maybeRateLimitInvalidToken(
      token,
      request,
      error,
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save draft answers.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  try {
    await enforceDraftRateLimit(token, request);
    await clearParticipantAnswerDraft(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return rateLimitJson(error);
    }

    const rateLimitResponse = await maybeRateLimitInvalidToken(
      token,
      request,
      error,
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to clear draft answers.",
      },
      { status: 400 },
    );
  }
}

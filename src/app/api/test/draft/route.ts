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
import {
  clearParticipantAnswerDraft,
  getParticipantAnswerDraft,
  saveParticipantAnswerDraft,
} from "@/services/participant-service";
import { RateLimitExceededError } from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const draftSchema = z.object({
  answers: z.record(z.string(), z.string()),
  questionTimings: z
    .record(z.string(), z.number().int().min(0).max(86_400))
    .default({}),
  currentQuestionIndex: z.number().int().min(0).default(0),
});

function draftResponse(
  draft: Awaited<ReturnType<typeof getParticipantAnswerDraft>>,
) {
  return {
    draft: draft
      ? {
          answers: draft.answers,
          questionTimings: draft.questionTimings,
          currentQuestionIndex: draft.currentQuestionIndex,
          updatedAt: draft.updatedAt.toISOString(),
        }
      : null,
  };
}

async function requestAccess(request: Request) {
  return getParticipantRequestAccess(request, "test_api_draft");
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof RateLimitExceededError) {
    return rateLimitJson(error);
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: isInvalidParticipantAccessError(error) ? 401 : 400 },
  );
}

export async function GET(request: Request) {
  try {
    const access = await requestAccess(request);

    if (!access) {
      return participantSessionRequiredResponse();
    }

    return NextResponse.json(
      draftResponse(await getParticipantAnswerDraft(access)),
    );
  } catch (error) {
    return errorResponse(error, "Unable to load draft answers.");
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requestAccess(request);

    if (!access) {
      return participantSessionRequiredResponse();
    }

    const body = draftSchema.parse(await request.json());
    return NextResponse.json(
      draftResponse(await saveParticipantAnswerDraft(access, body)),
    );
  } catch (error) {
    return errorResponse(error, "Unable to save draft answers.");
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await requestAccess(request);

    if (!access) {
      return participantSessionRequiredResponse();
    }

    await clearParticipantAnswerDraft(access);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to clear draft answers.");
  }
}

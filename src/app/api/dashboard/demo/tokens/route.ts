import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientSession } from "@/auth/session";
import { generateDashboardToken } from "@/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  testKey: z.literal("mbti").default("mbti"),
  participantId: z.string().uuid().optional(),
  participant_id: z.string().uuid().optional(),
  participantReference: z.string().trim().max(120).optional(),
  participant_reference: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getClientSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json().catch(() => ({})));
    if (
      body.participantId &&
      body.participant_id &&
      body.participantId !== body.participant_id
    ) {
      throw new Error("Participant identifiers do not match.");
    }

    const participantId = body.participantId ?? body.participant_id;
    const generated = await generateDashboardToken({
      clientId: session.clientId,
      testKey: body.testKey,
      participantId,
      participantReference:
        participantId
          ? undefined
          : body.participantReference ?? body.participant_reference,
    });
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    return NextResponse.json({
      participantUrl: `${origin}${generated.urlPath}`,
      token: generated.token,
      expiresAt: generated.expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate participant token.",
      },
      { status: 400 },
    );
  }
}

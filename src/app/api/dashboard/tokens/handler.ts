import { NextResponse } from "next/server";

import { dashboardTokenRequestSchema } from "@/app/api/dashboard/tokens/request";
import { getClientSession } from "@/auth/session";
import { generateDashboardAccess } from "@/services/dashboard-service";

export async function handleDashboardTokenPost(request: Request) {
  try {
    const session = await getClientSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = dashboardTokenRequestSchema.parse(
      await request.json().catch(() => ({})),
    );

    if (
      body.participantId &&
      body.participant_id &&
      body.participantId !== body.participant_id
    ) {
      throw new Error("Participant identifiers do not match.");
    }

    const participantId = body.participantId ?? body.participant_id;

    if (!participantId) {
      throw new Error("Select a participant before creating assessment access.");
    }

    const generated = await generateDashboardAccess({
      clientId: session.clientId,
      testKey: body.testKey,
      participantId,
    });
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    return NextResponse.json({
      accessUrl: `${origin}${generated.accessPath}`,
      accessCode: generated.accessCode,
      expiresAt: generated.expiresAt.toISOString(),
      testKey: body.testKey,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create participant access.";

    return NextResponse.json(
      { error: message },
      {
        status: message.includes("already has a live") ? 409 : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

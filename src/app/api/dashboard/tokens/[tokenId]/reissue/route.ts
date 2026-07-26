import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientSession } from "@/auth/session";
import { reissueClientParticipantAccess } from "@/services/token-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  tokenId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  try {
    const session = await getClientSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { tokenId } = paramsSchema.parse(await context.params);
    const generated = await reissueClientParticipantAccess({
      clientId: session.clientId,
      tokenId,
      requestedByClientUserId: session.userId,
    });
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;

    return NextResponse.json({
      accessUrl: `${origin}${generated.accessPath}`,
      accessCode: generated.accessCode,
      expiresAt: generated.expiresAt.toISOString(),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to rotate participant access.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

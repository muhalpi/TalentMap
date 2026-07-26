import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientSession } from "@/auth/session";
import { cancelClientParticipantAccess } from "@/services/token-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  tokenId: z.string().uuid(),
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ tokenId: string }> },
) {
  try {
    const session = await getClientSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { tokenId } = paramsSchema.parse(await context.params);
    const cancelled = await cancelClientParticipantAccess({
      clientId: session.clientId,
      tokenId,
    });

    return NextResponse.json({
      status: "expired",
      cancelledAt: cancelled.cancelledAt.toISOString(),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to cancel participant access.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

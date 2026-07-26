import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientSession } from "@/auth/session";
import { xlsxResponse } from "@/app/api/dashboard/import/request";
import { getClientParticipants } from "@/services/participant-directory-service";
import {
  buildResultImportTemplate,
  resultImportTemplateFileName,
} from "@/services/spreadsheet-workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  participantId: z.string().uuid().optional(),
  testKey: z.enum(["bfi", "mbti"]).optional(),
});

export async function GET(request: Request) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    participantId: url.searchParams.get("participantId") ?? undefined,
    testKey: url.searchParams.get("testKey") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Template parameters are invalid." },
      { status: 400 },
    );
  }
  const participants = await getClientParticipants(session.clientId);
  if (
    parsed.data.participantId &&
    !participants.some(
      (participant) =>
        participant.id === parsed.data.participantId &&
        participant.status === "active",
    )
  ) {
    return NextResponse.json({ error: "Participant not found." }, { status: 404 });
  }
  const buffer = await buildResultImportTemplate({
    participantId: parsed.data.participantId,
    testKey: parsed.data.testKey,
    participants: participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      email: participant.email,
      employeeId: participant.employeeId,
    })),
  });
  return xlsxResponse(buffer, resultImportTemplateFileName(parsed.data.testKey));
}

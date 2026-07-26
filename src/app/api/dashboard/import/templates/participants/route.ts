import { NextResponse } from "next/server";

import { getClientSession } from "@/auth/session";
import { xlsxResponse } from "@/app/api/dashboard/import/request";
import {
  buildParticipantImportTemplate,
  participantTemplateFileName,
} from "@/services/spreadsheet-workbook";
import { getClientParticipantFieldDefinitions } from "@/services/participant-field-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const definitions = await getClientParticipantFieldDefinitions(
    session.clientId,
  );
  return xlsxResponse(
    await buildParticipantImportTemplate(definitions),
    participantTemplateFileName(),
  );
}

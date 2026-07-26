import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getClientSession } from "@/auth/session";
import {
  readUploadedWorkbook,
  spreadsheetImportErrorResponse,
} from "@/app/api/dashboard/import/request";
import { importResultsFromWorkbook } from "@/services/spreadsheet-import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const participantIdSchema = z.string().uuid().optional();

export async function POST(request: Request) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { buffer, fileName, formData } = await readUploadedWorkbook(request);
    const rawParticipantId = formData.get("participantId");
    const participantIdResult = participantIdSchema.safeParse(
      typeof rawParticipantId === "string" && rawParticipantId
        ? rawParticipantId
        : undefined,
    );
    if (!participantIdResult.success) {
      return NextResponse.json(
        { error: "The participant profile is invalid." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const participantId = participantIdResult.data;
    const result = await importResultsFromWorkbook({
      clientId: session.clientId,
      requestedByClientUserId: session.userId,
      buffer,
      fileName,
      participantId,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/results");
    revalidatePath("/dashboard/participants");
    if (participantId) {
      revalidatePath(`/dashboard/participants/${participantId}`);
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return spreadsheetImportErrorResponse(error);
  }
}

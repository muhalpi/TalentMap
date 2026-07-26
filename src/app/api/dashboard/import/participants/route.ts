import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getClientSession } from "@/auth/session";
import {
  readUploadedWorkbook,
  spreadsheetImportErrorResponse,
} from "@/app/api/dashboard/import/request";
import { importParticipantsFromWorkbook } from "@/services/spreadsheet-import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { buffer } = await readUploadedWorkbook(request);
    const result = await importParticipantsFromWorkbook({
      clientId: session.clientId,
      buffer,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/participants");
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return spreadsheetImportErrorResponse(error);
  }
}

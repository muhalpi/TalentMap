import { NextResponse } from "next/server";

import { getClientSession } from "@/auth/session";
import { getClientResultExportRows } from "@/services/dashboard-service";
import {
  buildResultExportWorkbook,
  resultExportFileName,
} from "@/services/spreadsheet-workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getClientSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resultId = searchParams.get("resultId");
  const rows = await getClientResultExportRows({
    clientId: session.clientId,
    resultId: resultId ?? undefined,
  });

  if (resultId && rows.length === 0) {
    return NextResponse.json({ error: "Result not found." }, { status: 404 });
  }

  const workbook = await buildResultExportWorkbook(rows);

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${resultExportFileName(resultId)}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

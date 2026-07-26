import { NextResponse } from "next/server";

import { SpreadsheetImportError } from "@/services/spreadsheet-import-service";
import { MAX_SPREADSHEET_BYTES } from "@/services/spreadsheet-workbook";

export async function readUploadedWorkbook(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new SpreadsheetImportError("Choose an XLSX workbook to upload.");
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new SpreadsheetImportError("Only .xlsx workbooks are accepted.");
  }
  if (file.size === 0) {
    throw new SpreadsheetImportError("The selected workbook is empty.");
  }
  if (file.size > MAX_SPREADSHEET_BYTES) {
    throw new SpreadsheetImportError("The workbook must be 10 MB or smaller.");
  }

  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    formData,
  };
}

export function spreadsheetImportErrorResponse(error: unknown) {
  if (error instanceof SpreadsheetImportError) {
    return NextResponse.json(
      {
        error: error.message,
        issues: error.issues.slice(0, 100),
        issueCount: error.issues.length,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { error: "The workbook could not be processed." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export function xlsxResponse(buffer: Buffer, fileName: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(buffer.byteLength),
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

import assert from "node:assert/strict";
import test from "node:test";

import ExcelJS from "exceljs";

import type { DashboardResultDetailDto } from "@/services/dashboard-service";
import type { ParticipantFieldDefinitionDto } from "@/services/participant-field-service";
import {
  buildParticipantImportTemplate,
  buildResultExportWorkbook,
  buildResultImportTemplate,
  parseParticipantImportWorkbook,
  parseResultImportWorkbook,
} from "@/services/spreadsheet-workbook";
import { getTestDefinition } from "@/tests/registry";

const participantId = "11111111-1111-4111-8111-111111111111";
const resultId = "22222222-2222-4222-8222-222222222222";
const participantDefinitions: ParticipantFieldDefinitionDto[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    fieldKey: "grade_level",
    label: "Grade level",
    fieldType: "select",
    options: ["Grade 7", "Grade 8"],
    isRequired: true,
    isSearchable: true,
    isSensitive: false,
    isActive: true,
    displayOrder: 0,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    fieldKey: "phone",
    label: "Phone",
    fieldType: "phone",
    options: [],
    isRequired: false,
    isSearchable: false,
    isSensitive: true,
    isActive: true,
    displayOrder: 1,
  },
];

async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  return workbook;
}

async function writeWorkbook(workbook: ExcelJS.Workbook) {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("participant template follows tenant field definitions", async () => {
  const workbook = await loadWorkbook(
    await buildParticipantImportTemplate(participantDefinitions),
  );
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Instructions", "Participants", "Field Guide", "Field Options"],
  );

  const sheet = workbook.getWorksheet("Participants");
  assert.ok(sheet);
  const headers = sheet.getRow(1).values;
  assert.ok(Array.isArray(headers));
  assert.deepEqual(headers.slice(1), [
    "name",
    "email",
    "identifier",
    "external_reference",
    "tags",
    "custom_grade_level",
    "custom_phone",
  ]);
  assert.equal(sheet.views[0]?.state, "frozen");
  assert.equal(sheet.getColumn("C").numFmt, "@");
});

test("participant parser preserves identifiers and splits tags", async () => {
  const workbook = await loadWorkbook(
    await buildParticipantImportTemplate(participantDefinitions),
  );
  const sheet = workbook.getWorksheet("Participants");
  assert.ok(sheet);
  sheet.getCell("A2").value = "Avery Tan";
  sheet.getCell("B2").value = "AVERY@example.com";
  sheet.getCell("C2").value = "00127";
  sheet.getCell("E2").value = "leadership; hiring";
  sheet.getCell("F2").value = "Grade 8";
  sheet.getCell("G2").value = "+62 812 3456 7890";

  const parsed = await parseParticipantImportWorkbook(
    await writeWorkbook(workbook),
    participantDefinitions,
  );
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.email, "avery@example.com");
  assert.equal(parsed.rows[0]?.employeeId, "00127");
  assert.deepEqual(parsed.rows[0]?.tags, ["leadership", "hiring"]);
  assert.deepEqual(parsed.rows[0]?.customFields, {
    grade_level: "Grade 8",
    phone: "+62 812 3456 7890",
  });
});

test("profile result template parses a complete BFI response row", async () => {
  const workbook = await loadWorkbook(
    await buildResultImportTemplate({ participantId, testKey: "bfi" }),
  );
  const sheet = workbook.getWorksheet("BFI Results");
  assert.ok(sheet);
  sheet.getCell("B2").value = new Date("2026-07-20T04:30:00.000Z");
  sheet.getCell("C2").value = 420;
  const definition = getTestDefinition("bfi");
  definition.questions.forEach((question, index) => {
    sheet.getCell(2, index + 4).value = question.options[0]?.value ?? "1";
  });

  const parsed = await parseResultImportWorkbook(
    await writeWorkbook(workbook),
    participantId,
  );
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.participantId, participantId);
  assert.equal(parsed.rows[0]?.testKey, "bfi");
  assert.equal(Object.keys(parsed.rows[0]?.answers ?? {}).length, 50);
});

test("result parser reports the exact cell for an invalid answer", async () => {
  const workbook = await loadWorkbook(
    await buildResultImportTemplate({ participantId, testKey: "bfi" }),
  );
  const sheet = workbook.getWorksheet("BFI Results");
  assert.ok(sheet);
  const definition = getTestDefinition("bfi");
  definition.questions.forEach((question, index) => {
    sheet.getCell(2, index + 4).value = question.options[0]?.value ?? "1";
  });
  sheet.getCell("D2").value = "9";

  const parsed = await parseResultImportWorkbook(
    await writeWorkbook(workbook),
    participantId,
  );
  assert.ok(parsed.issues.some((issue) => issue.column === "q01"));
});

test("result export separates summary, dimensions, analysis, and raw answers", async () => {
  const definition = getTestDefinition("bfi");
  const answers = Object.fromEntries(
    definition.questions.map((question) => [
      question.id,
      question.options[0]?.value ?? "1",
    ]),
  );
  const score = definition.score(answers);
  const result: DashboardResultDetailDto = {
    id: resultId,
    testKey: "bfi",
    testName: definition.name,
    participant: {
      id: participantId,
      name: "Avery Tan",
      email: "avery@example.com",
      employeeId: "00127",
      status: "active",
      profileHref: `/dashboard/participants/${participantId}`,
    },
    participantReference: null,
    source: "xlsx_import",
    importedAt: "2026-07-20T04:30:00.000Z",
    importedFileName: "bfi-results.xlsx",
    resultLabel: "BFI profile",
    submittedAt: "2026-07-20T04:30:00.000Z",
    retentionUntil: "2027-07-20T04:30:00.000Z",
    retentionStatus: "active",
    tokenId: null,
    tokenPreview: null,
    importedBy: {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Rina Admin",
      email: "rina@example.com",
    },
    testVersion: definition.version,
    rawAnswers: answers,
    questionTimings: { [definition.questions[0]?.id ?? "q1"]: 8 },
    durationSeconds: 420,
    scoredResult: score.result,
    scoreSummary: score.summary,
    interpretation: score.interpretation ?? null,
  };

  const workbook = await loadWorkbook(
    await buildResultExportWorkbook([result]),
  );
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Instructions", "Results", "Dimension Scores", "Analysis", "Raw Answers"],
  );
  assert.equal(
    workbook.getWorksheet("Results")?.getCell("M2").value,
    "XLSX import",
  );
  assert.equal(
    workbook.getWorksheet("Results")?.getCell("O2").value,
    "bfi-results.xlsx",
  );
  assert.equal(
    workbook.getWorksheet("Results")?.getCell("P2").value,
    "Rina Admin",
  );
  assert.equal(workbook.getWorksheet("Results")?.getCell("E2").value, "00127");
  assert.equal(workbook.getWorksheet("Raw Answers")?.rowCount, 51);
  for (const sheet of workbook.worksheets) {
    const headers = sheet.getRow(1).values;
    assert.ok(Array.isArray(headers));
    assert.ok(!headers.some((value) => String(value).includes("json")));
  }
});

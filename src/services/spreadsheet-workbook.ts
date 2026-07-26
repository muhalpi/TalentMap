import ExcelJS, { type Cell, type Row, type Worksheet } from "exceljs";

import type { DashboardResultDetailDto } from "@/services/dashboard-service";
import {
  parseParticipantCustomFieldInput,
  parseParticipantTags,
  participantFieldTypeLabels,
  type ParticipantCustomFieldValue,
  type ParticipantFieldDefinitionDto,
} from "@/services/participant-field-service";
import { getTestDefinition } from "@/tests/registry";
import type { AnswerMap } from "@/tests/shared/types";

export const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024;
export const MAX_PARTICIPANT_IMPORT_ROWS = 1_000;
export const MAX_RESULT_IMPORT_ROWS = 500;

export interface SpreadsheetIssue {
  sheet: string;
  row: number;
  column?: string;
  message: string;
}

export interface ParticipantImportRow {
  rowNumber: number;
  name: string;
  email: string | null;
  employeeId: string | null;
  externalReference: string | null;
  tags: string[];
  customFields: Record<string, ParticipantCustomFieldValue>;
}

export interface ResultImportRow {
  sheet: string;
  rowNumber: number;
  participantId: string;
  testKey: "bfi" | "mbti";
  submittedAt: Date;
  durationSeconds: number;
  answers: AnswerMap;
}

export interface ParticipantTemplateReference {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
}

const colors = {
  navy: "FF061A38",
  blue: "FF2563EB",
  paleBlue: "FFEAF2FF",
  paleGreen: "FFE8F8F0",
  paleOrange: "FFFFF2E8",
  canvas: "FFF7F9FC",
  border: "FFE2E8F0",
  text: "FF0F172A",
  muted: "FF64748B",
  white: "FFFFFFFF",
};

const participantBaseColumns = [
  { header: "name", key: "name", width: 28 },
  { header: "email", key: "email", width: 30 },
  { header: "identifier", key: "employeeId", width: 20 },
  { header: "external_reference", key: "externalReference", width: 22 },
  { header: "tags", key: "tags", width: 28 },
] as const;

function participantCustomColumnHeader(fieldKey: string) {
  return `custom_${fieldKey}`;
}

function participantColumns(definitions: ParticipantFieldDefinitionDto[]) {
  return [
    ...participantBaseColumns,
    ...definitions
      .filter((field) => field.isActive)
      .map((field) => ({
        header: participantCustomColumnHeader(field.fieldKey),
        key: field.fieldKey,
        width:
          field.fieldType === "long_text"
            ? 36
            : field.fieldType === "multi_select"
              ? 28
              : 22,
      })),
  ];
}

const resultSheetConfig = {
  bfi: {
    sheetName: "BFI Results",
    label: "Big Five",
    answerHint: "1, 2, 3, 4, or 5",
  },
  mbti: { sheetName: "MBTI Results", label: "MBTI", answerHint: "A or B" },
} as const;

function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TalentMap";
  workbook.lastModifiedBy = "TalentMap";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  return workbook;
}

function styleTitle(cell: Cell) {
  cell.font = {
    name: "Aptos Display",
    size: 18,
    bold: true,
    color: { argb: colors.white },
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colors.navy },
  };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function styleHeaderRow(row: Row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = {
      name: "Aptos",
      size: 10,
      bold: true,
      color: { argb: colors.white },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.blue },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: colors.navy } },
    };
  });
}

function styleDataSheet(sheet: Worksheet, lastColumn: number) {
  sheet.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: lastColumn },
  };
  styleHeaderRow(sheet.getRow(1));
  sheet.properties.defaultRowHeight = 20;
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2,
    },
  };
}

function addInstructionsSheet(
  workbook: ExcelJS.Workbook,
  title: string,
  sections: Array<{ heading: string; details: string[] }>,
) {
  const sheet = workbook.addWorksheet("Instructions", {
    views: [{ showGridLines: false }],
  });
  sheet.columns = [
    { key: "marker", width: 5 },
    { key: "content", width: 92 },
  ];
  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = title;
  sheet.getRow(1).height = 34;
  styleTitle(sheet.getCell("A1"));

  let rowNumber = 3;
  for (const [sectionIndex, section] of sections.entries()) {
    sheet.mergeCells(rowNumber, 1, rowNumber, 2);
    const headingCell = sheet.getCell(rowNumber, 1);
    headingCell.value = section.heading;
    headingCell.font = {
      name: "Aptos",
      size: 12,
      bold: true,
      color: { argb: colors.text },
    };
    headingCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: sectionIndex % 2 === 0 ? colors.paleBlue : colors.paleGreen,
      },
    };
    headingCell.alignment = { vertical: "middle" };
    sheet.getRow(rowNumber).height = 24;
    rowNumber += 1;

    for (const [detailIndex, detail] of section.details.entries()) {
      sheet.getCell(rowNumber, 1).value = detailIndex + 1;
      sheet.getCell(rowNumber, 1).font = {
        bold: true,
        color: { argb: colors.blue },
      };
      sheet.getCell(rowNumber, 1).alignment = {
        horizontal: "center",
        vertical: "top",
      };
      sheet.getCell(rowNumber, 2).value = detail;
      sheet.getCell(rowNumber, 2).font = {
        name: "Aptos",
        size: 10,
        color: { argb: colors.text },
      };
      sheet.getCell(rowNumber, 2).alignment = {
        wrapText: true,
        vertical: "top",
      };
      sheet.getRow(rowNumber).height = 32;
      rowNumber += 1;
    }

    rowNumber += 1;
  }

  return sheet;
}

async function workbookBuffer(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function addParticipantFieldGuide(
  workbook: ExcelJS.Workbook,
  definitions: ParticipantFieldDefinitionDto[],
) {
  const sheet = workbook.addWorksheet("Field Guide");
  sheet.columns = [
    { header: "column", key: "column", width: 28 },
    { header: "label", key: "label", width: 28 },
    { header: "type", key: "type", width: 20 },
    { header: "required", key: "required", width: 12 },
    { header: "allowed_values", key: "allowedValues", width: 52 },
    { header: "notes", key: "notes", width: 52 },
  ];
  for (const definition of definitions.filter((field) => field.isActive)) {
    sheet.addRow({
      column: participantCustomColumnHeader(definition.fieldKey),
      label: definition.label,
      type: participantFieldTypeLabels[definition.fieldType],
      required: definition.isRequired ? "Yes" : "No",
      allowedValues: definition.options.join("; "),
      notes: definition.isSensitive
        ? "Sensitive tenant field. It is excluded from directory search and list summaries."
        : definition.isSearchable
          ? "Included in participant search."
          : "Excluded from participant search.",
    });
  }
  styleDataSheet(sheet, 6);
  sheet.getColumn("allowedValues").alignment = {
    wrapText: true,
    vertical: "top",
  };
  sheet.getColumn("notes").alignment = { wrapText: true, vertical: "top" };
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    sheet.getRow(rowNumber).height = 36;
  }
}

function addParticipantFieldValidations(
  workbook: ExcelJS.Workbook,
  sheet: Worksheet,
  definitions: ParticipantFieldDefinitionDto[],
) {
  const optionsSheet = workbook.addWorksheet("Field Options");
  optionsSheet.state = "veryHidden";

  for (const [index, definition] of definitions
    .filter((field) => field.isActive)
    .entries()) {
    const columnNumber = participantBaseColumns.length + index + 1;
    const columnLetter = sheet.getColumn(columnNumber).letter;
    const headerCell = sheet.getCell(1, columnNumber);
    headerCell.note = `${definition.label} · ${participantFieldTypeLabels[definition.fieldType]}${
      definition.isRequired ? " · Required" : " · Optional"
    }`;

    if (definition.options.length) {
      const optionsColumn = index + 1;
      optionsSheet.getCell(1, optionsColumn).value = definition.fieldKey;
      definition.options.forEach((option, optionIndex) => {
        optionsSheet.getCell(optionIndex + 2, optionsColumn).value = option;
      });
    }

    for (
      let rowNumber = 2;
      rowNumber <= MAX_PARTICIPANT_IMPORT_ROWS + 1;
      rowNumber += 1
    ) {
      const cell = sheet.getCell(`${columnLetter}${rowNumber}`);
      if (definition.fieldType === "select") {
        const optionColumnLetter = optionsSheet.getColumn(index + 1).letter;
        const lastOptionRow = definition.options.length + 1;
        cell.dataValidation = {
          type: "list",
          allowBlank: !definition.isRequired,
          formulae: [
            `'Field Options'!$${optionColumnLetter}$2:$${optionColumnLetter}$${lastOptionRow}`,
          ],
          showErrorMessage: true,
          errorTitle: "Choose an available option",
          error: `Select a value listed for ${definition.label}.`,
        };
      } else if (definition.fieldType === "boolean") {
        cell.dataValidation = {
          type: "list",
          allowBlank: !definition.isRequired,
          formulae: ['"Yes,No"'],
          showErrorMessage: true,
          errorTitle: "Use Yes or No",
          error: `${definition.label} accepts Yes or No.`,
        };
      } else if (definition.fieldType === "number") {
        cell.numFmt = "0.00########";
      } else if (definition.fieldType === "date") {
        cell.numFmt = "yyyy-mm-dd";
      } else {
        cell.numFmt = "@";
      }
    }
  }
}

export async function buildParticipantImportTemplate(
  definitions: ParticipantFieldDefinitionDto[] = [],
) {
  const workbook = createWorkbook();
  addInstructionsSheet(workbook, "TalentMap participant import", [
    {
      heading: "How to use this workbook",
      details: [
        "Enter one participant per row on the Participants sheet. Keep the header names unchanged and do not add formulas.",
        "Name is required. Email, identifier, and external reference must each be unique within your TalentMap tenant when supplied.",
        "Separate multiple tags with semicolons, for example: leadership; hiring; jakarta.",
        "Custom columns match the participant fields currently configured by your tenant. Review the Field Guide before entering values.",
        `Upload at most ${MAX_PARTICIPANT_IMPORT_ROWS.toLocaleString("en-US")} participant rows in one workbook. The import is all-or-nothing: fix every reported row before retrying.`,
      ],
    },
    {
      heading: "Cell formats",
      details: [
        "Use Text format for names, identifiers, references, phone numbers, and tags. This preserves leading zeroes.",
        "Use YYYY-MM-DD for date fields, plain numbers for number fields, and semicolons between multiple-choice values.",
        "Use a normal email address in the email column. Blank optional cells are accepted.",
      ],
    },
  ]);

  const sheet = workbook.addWorksheet("Participants");
  const columns = participantColumns(definitions);
  sheet.columns = columns.map((column) => ({
    ...column,
    style: { numFmt: "@" },
  }));
  styleDataSheet(sheet, columns.length);
  sheet.getColumn("email").alignment = { horizontal: "left" };
  sheet.getColumn("tags").alignment = { wrapText: true, vertical: "top" };
  sheet.getCell("A2").note = "Required. Example: Avery Tan";
  sheet.getCell("B2").note = "Optional. Must be unique when supplied.";
  sheet.getCell("C2").note =
    "Optional. Stored as text to preserve leading zeroes.";
  addParticipantFieldGuide(workbook, definitions);
  addParticipantFieldValidations(workbook, sheet, definitions);
  return workbookBuffer(workbook);
}

function questionColumn(questionNumber: number) {
  return `q${String(questionNumber).padStart(2, "0")}`;
}

function addQuestionGuide(
  workbook: ExcelJS.Workbook,
  testKeys: Array<"bfi" | "mbti">,
) {
  const sheet = workbook.addWorksheet("Question Guide");
  sheet.columns = [
    { header: "test_key", key: "testKey", width: 12 },
    { header: "column", key: "column", width: 12 },
    { header: "question", key: "question", width: 68 },
    { header: "allowed_values", key: "allowedValues", width: 56 },
  ];
  for (const testKey of testKeys) {
    const definition = getTestDefinition(testKey);
    for (const question of definition.questions) {
      sheet.addRow({
        testKey: testKey.toUpperCase(),
        column: questionColumn(question.no),
        question: question.prompt,
        allowedValues: question.options
          .map((option) => `${option.value} = ${option.label}`)
          .join("; "),
      });
    }
  }
  styleDataSheet(sheet, 4);
  sheet.getColumn("question").alignment = { wrapText: true, vertical: "top" };
  sheet.getColumn("allowedValues").alignment = {
    wrapText: true,
    vertical: "top",
  };
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    sheet.getRow(rowNumber).height =
      sheet.getCell(rowNumber, 1).value === "BFI" ? 52 : 42;
  }
}

function addResultInputSheet(
  workbook: ExcelJS.Workbook,
  testKey: "bfi" | "mbti",
  participantId?: string,
) {
  const config = resultSheetConfig[testKey];
  const definition = getTestDefinition(testKey);
  const sheet = workbook.addWorksheet(config.sheetName);
  sheet.columns = [
    {
      header: "participant_id",
      key: "participantId",
      width: 38,
      style: { numFmt: "@" },
    },
    {
      header: "submitted_at",
      key: "submittedAt",
      width: 22,
      style: { numFmt: "yyyy-mm-dd hh:mm" },
    },
    {
      header: "duration_seconds",
      key: "durationSeconds",
      width: 18,
      style: { numFmt: "0" },
    },
    ...definition.questions.map((question) => ({
      header: questionColumn(question.no),
      key: questionColumn(question.no),
      width: 9,
      style: { numFmt: "@" },
    })),
  ];
  styleDataSheet(sheet, sheet.columnCount);

  if (participantId) {
    sheet.getCell("A2").value = participantId;
    sheet.getCell("A2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colors.paleBlue },
    };
    sheet.getCell("A2").note =
      "This participant ID was prefilled from the profile.";
  }

  sheet.getCell("B2").note =
    "Optional. Use an Excel date/time or ISO date. Blank uses the upload time.";
  sheet.getCell("C2").note = "Optional whole seconds. Blank uses 0.";
  for (let index = 0; index < definition.questions.length; index += 1) {
    const columnNumber = index + 4;
    const columnLetter = sheet.getColumn(columnNumber).letter;
    const formula = testKey === "bfi" ? '"1,2,3,4,5"' : '"A,B"';
    for (
      let rowNumber = 2;
      rowNumber <= MAX_RESULT_IMPORT_ROWS + 1;
      rowNumber += 1
    ) {
      sheet.getCell(`${columnLetter}${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: `Invalid ${config.label} answer`,
        error: `Use ${config.answerHint}.`,
        formulae: [formula],
      };
    }
  }

  return sheet;
}

function addParticipantReferenceSheet(
  workbook: ExcelJS.Workbook,
  participants: ParticipantTemplateReference[],
) {
  const sheet = workbook.addWorksheet("Participant IDs");
  sheet.columns = [
    { header: "participant_id", key: "id", width: 38, style: { numFmt: "@" } },
    { header: "name", key: "name", width: 28 },
    { header: "email", key: "email", width: 30 },
    {
      header: "employee_id",
      key: "employeeId",
      width: 18,
      style: { numFmt: "@" },
    },
  ];
  for (const participant of participants) {
    sheet.addRow(participant);
  }
  styleDataSheet(sheet, 4);
}

export async function buildResultImportTemplate(input: {
  participantId?: string;
  participants?: ParticipantTemplateReference[];
  testKey?: "bfi" | "mbti";
}) {
  const workbook = createWorkbook();
  const testKeys: Array<"bfi" | "mbti"> = input.testKey
    ? [input.testKey]
    : ["bfi", "mbti"];
  addInstructionsSheet(workbook, "TalentMap raw-result import", [
    {
      heading: "How to use this workbook",
      details: [
        "Enter raw answers only. TalentMap calculates scores and analysis after upload; do not enter a type, band, percentage, or interpretation.",
        "Use one row per participant and assessment. For bulk imports, copy the exact participant UUID from the Participant IDs sheet.",
        "Keep the worksheet and column names unchanged. Every question cell is required for a populated result row.",
        `Upload at most ${MAX_RESULT_IMPORT_ROWS.toLocaleString("en-US")} result rows in one workbook. Duplicate participant/test rows in the same file are rejected.`,
      ],
    },
    {
      heading: "Answer formats",
      details: [
        "BFI answers are 1 to 5. The Question Guide explains each scale value.",
        "MBTI answers are A or B. The Question Guide shows the answer text represented by each letter.",
        "submitted_at is optional and should be an Excel date/time or ISO timestamp. duration_seconds is an optional whole number.",
      ],
    },
  ]);
  for (const testKey of testKeys) {
    addResultInputSheet(workbook, testKey, input.participantId);
  }
  if (!input.participantId) {
    addParticipantReferenceSheet(workbook, input.participants ?? []);
  }
  addQuestionGuide(workbook, testKeys);
  return workbookBuffer(workbook);
}

function normalizedHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function cellInput(cell: Cell): string | number | Date | null {
  const value = cell.value;
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (
    value instanceof Date ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (typeof value === "object" && "formula" in value) {
    throw new Error("Formulas are not accepted in import cells.");
  }
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  if (
    typeof value === "object" &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return value.text;
  }
  return cell.text || null;
}

function textValue(value: string | number | Date | null) {
  if (value === null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value).trim();
}

function headerMap(sheet: Worksheet) {
  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = normalizedHeader(cell.text);
    if (header) {
      headers.set(header, columnNumber);
    }
  });
  return headers;
}

function requireHeaders(
  sheet: Worksheet,
  headers: Map<string, number>,
  expected: string[],
) {
  return expected
    .filter((header) => !headers.has(header))
    .map<SpreadsheetIssue>((header) => ({
      sheet: sheet.name,
      row: 1,
      column: header,
      message: `Required column "${header}" is missing.`,
    }));
}

function readByHeader(row: Row, headers: Map<string, number>, header: string) {
  const columnNumber = headers.get(header);
  return columnNumber ? cellInput(row.getCell(columnNumber)) : null;
}

async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  return workbook;
}

function optionalText(value: string | number | Date | null) {
  const text = textValue(value);
  return text || null;
}

export async function parseParticipantImportWorkbook(
  buffer: Buffer,
  definitions: ParticipantFieldDefinitionDto[] = [],
) {
  const workbook = await loadWorkbook(buffer);
  const sheet = workbook.getWorksheet("Participants");
  if (!sheet) {
    return {
      rows: [] as ParticipantImportRow[],
      issues: [
        {
          sheet: "Participants",
          row: 1,
          message: 'Worksheet "Participants" was not found.',
        },
      ],
    };
  }
  const headers = headerMap(sheet);
  const columns = participantColumns(definitions);
  const issues = requireHeaders(
    sheet,
    headers,
    columns
      .map((column) => column.header)
      .filter((header) => header !== "identifier"),
  );
  if (!headers.has("identifier") && !headers.has("employee_id")) {
    issues.push({
      sheet: sheet.name,
      row: 1,
      column: "identifier",
      message: 'Required column "identifier" is missing.',
    });
  }
  const rows: ParticipantImportRow[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    let values: Record<string, string | number | Date | null>;
    try {
      values = Object.fromEntries(
        columns.map((column) => [
          column.header,
          readByHeader(row, headers, column.header),
        ]),
      );
      if (!headers.has("identifier") && headers.has("employee_id")) {
        values.identifier = readByHeader(row, headers, "employee_id");
      }
    } catch (error) {
      issues.push({
        sheet: sheet.name,
        row: rowNumber,
        message:
          error instanceof Error ? error.message : "The row could not be read.",
      });
      continue;
    }
    if (Object.values(values).every((value) => textValue(value) === "")) {
      continue;
    }

    const name = textValue(values.name);
    const email = optionalText(values.email)?.toLowerCase() ?? null;
    const employeeId = optionalText(values.identifier);
    const externalReference = optionalText(values.external_reference);
    const tagsText = textValue(values.tags);
    if (name.length < 2 || name.length > 180) {
      issues.push({
        sheet: sheet.name,
        row: rowNumber,
        column: "name",
        message: "Name must contain 2 to 180 characters.",
      });
    }
    if (
      email &&
      (email.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      issues.push({
        sheet: sheet.name,
        row: rowNumber,
        column: "email",
        message: "Use a valid email with at most 180 characters.",
      });
    }
    for (const [column, value, max] of [
      ["identifier", employeeId, 120],
      ["external_reference", externalReference, 120],
      ["tags", tagsText || null, 1_000],
    ] as const) {
      if (value && value.length > max) {
        issues.push({
          sheet: sheet.name,
          row: rowNumber,
          column,
          message: `Use at most ${max} characters.`,
        });
      }
    }
    const tags = parseParticipantTags(tagsText);
    if (
      new Set(
        tagsText
          .split(/[;,]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      ).size > 30
    ) {
      issues.push({
        sheet: sheet.name,
        row: rowNumber,
        column: "tags",
        message: "Use at most 30 unique tags.",
      });
    }

    const customFields: Record<string, ParticipantCustomFieldValue> = {};
    for (const definition of definitions.filter((field) => field.isActive)) {
      const column = participantCustomColumnHeader(definition.fieldKey);
      const customValue = parseParticipantCustomFieldInput(
        definition,
        values[column],
      );
      if (customValue.error) {
        issues.push({
          sheet: sheet.name,
          row: rowNumber,
          column,
          message: customValue.error,
        });
      } else if (customValue.value !== null) {
        customFields[definition.fieldKey] = customValue.value;
      }
    }
    rows.push({
      rowNumber,
      name,
      email,
      employeeId,
      externalReference,
      tags,
      customFields,
    });
  }

  if (rows.length > MAX_PARTICIPANT_IMPORT_ROWS) {
    issues.push({
      sheet: sheet.name,
      row: MAX_PARTICIPANT_IMPORT_ROWS + 2,
      message: `The workbook exceeds the ${MAX_PARTICIPANT_IMPORT_ROWS.toLocaleString("en-US")} participant limit.`,
    });
  }
  if (!rows.length && !issues.length) {
    issues.push({
      sheet: sheet.name,
      row: 2,
      message: "Add at least one participant row before uploading.",
    });
  }
  return { rows, issues };
}

function parsedDate(value: string | number | Date | null) {
  if (value === null || value === "") {
    return new Date();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parsedDuration(value: string | number | Date | null) {
  if (value === null || value === "") {
    return 0;
  }
  const duration = Number(value);
  return Number.isInteger(duration) &&
    duration >= 0 &&
    duration <= 2_147_483_647
    ? duration
    : null;
}

export async function parseResultImportWorkbook(
  buffer: Buffer,
  forcedParticipantId?: string,
) {
  const workbook = await loadWorkbook(buffer);
  const issues: SpreadsheetIssue[] = [];
  const rows: ResultImportRow[] = [];

  for (const testKey of ["bfi", "mbti"] as const) {
    const config = resultSheetConfig[testKey];
    const sheet = workbook.getWorksheet(config.sheetName);
    if (!sheet) {
      continue;
    }
    const definition = getTestDefinition(testKey);
    const expectedHeaders = [
      "participant_id",
      "submitted_at",
      "duration_seconds",
      ...definition.questions.map((question) => questionColumn(question.no)),
    ];
    const headers = headerMap(sheet);
    issues.push(...requireHeaders(sheet, headers, expectedHeaders));

    for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      let participantId = "";
      let submittedAtValue: string | number | Date | null = null;
      let durationValue: string | number | Date | null = null;
      const answers: AnswerMap = {};
      try {
        participantId = textValue(readByHeader(row, headers, "participant_id"));
        submittedAtValue = readByHeader(row, headers, "submitted_at");
        durationValue = readByHeader(row, headers, "duration_seconds");
        for (const question of definition.questions) {
          answers[question.id] = textValue(
            readByHeader(row, headers, questionColumn(question.no)),
          ).toUpperCase();
        }
      } catch (error) {
        issues.push({
          sheet: sheet.name,
          row: rowNumber,
          message:
            error instanceof Error
              ? error.message
              : "The row could not be read.",
        });
        continue;
      }

      const hasAnyAnswer = Object.values(answers).some(Boolean);
      if (
        !participantId &&
        !hasAnyAnswer &&
        submittedAtValue === null &&
        durationValue === null
      ) {
        continue;
      }
      if (forcedParticipantId) {
        if (participantId && participantId !== forcedParticipantId) {
          issues.push({
            sheet: sheet.name,
            row: rowNumber,
            column: "participant_id",
            message: "The participant ID does not match the open profile.",
          });
        }
        participantId = forcedParticipantId;
      }
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          participantId,
        )
      ) {
        issues.push({
          sheet: sheet.name,
          row: rowNumber,
          column: "participant_id",
          message: "Use a valid participant UUID from TalentMap.",
        });
      }
      const submittedAt = parsedDate(submittedAtValue);
      if (!submittedAt) {
        issues.push({
          sheet: sheet.name,
          row: rowNumber,
          column: "submitted_at",
          message: "Use a valid Excel or ISO date/time.",
        });
      } else if (submittedAt.getTime() > Date.now() + 5 * 60 * 1000) {
        issues.push({
          sheet: sheet.name,
          row: rowNumber,
          column: "submitted_at",
          message: "Submitted time cannot be in the future.",
        });
      }
      const durationSeconds = parsedDuration(durationValue);
      if (durationSeconds === null) {
        issues.push({
          sheet: sheet.name,
          row: rowNumber,
          column: "duration_seconds",
          message: "Duration must be a non-negative whole number of seconds.",
        });
      }
      for (const question of definition.questions) {
        const answer = answers[question.id];
        if (!question.options.some((option) => option.value === answer)) {
          issues.push({
            sheet: sheet.name,
            row: rowNumber,
            column: questionColumn(question.no),
            message: `Use one of: ${question.options.map((option) => option.value).join(", ")}.`,
          });
        }
      }
      if (submittedAt && durationSeconds !== null) {
        rows.push({
          sheet: sheet.name,
          rowNumber,
          participantId,
          testKey,
          submittedAt,
          durationSeconds,
          answers,
        });
      }
    }
  }

  if (!rows.length && !issues.length) {
    issues.push({
      sheet: "Results",
      row: 2,
      message: "Add at least one result row before uploading.",
    });
  }
  if (rows.length > MAX_RESULT_IMPORT_ROWS) {
    issues.push({
      sheet: "Results",
      row: MAX_RESULT_IMPORT_ROWS + 2,
      message: `The workbook exceeds the ${MAX_RESULT_IMPORT_ROWS.toLocaleString("en-US")} result limit.`,
    });
  }
  return { rows, issues };
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = typeof value === "string" ? value : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function readableValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => `• ${readableValue(item)}`).join("\n");
  }
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, nested]) => `${key}: ${readableValue(nested)}`)
      .join("\n");
  }
  return safeText(value);
}

function addExportReadMe(workbook: ExcelJS.Workbook, resultCount: number) {
  addInstructionsSheet(workbook, "TalentMap assessment results", [
    {
      heading: "Workbook contents",
      details: [
        `Results contains one clean summary row for each of the ${resultCount.toLocaleString("en-US")} exported assessments.`,
        "Dimension Scores contains normalized BFI trait scores and MBTI dimension counts for analysis and pivoting.",
        "Analysis contains readable platform-generated result and interpretation fields without JSON blobs.",
        "Raw Answers contains one row per question, including the prompt, selected value, label, and recorded question time.",
      ],
    },
    {
      heading: "Privacy",
      details: [
        "This workbook may contain personal and assessment data. Store, share, and delete it according to your organization's privacy and retention requirements.",
      ],
    },
  ]);
}

function setExportColumns(
  sheet: Worksheet,
  columns: Array<{
    header: string;
    key: string;
    width: number;
    numFmt?: string;
  }>,
) {
  sheet.columns = columns.map((column) => ({
    ...column,
    style: column.numFmt ? { numFmt: column.numFmt } : undefined,
  }));
  styleDataSheet(sheet, columns.length);
}

export async function buildResultExportWorkbook(
  rows: DashboardResultDetailDto[],
) {
  const workbook = createWorkbook();
  addExportReadMe(workbook, rows.length);

  const resultsSheet = workbook.addWorksheet("Results");
  setExportColumns(resultsSheet, [
    { header: "result_id", key: "resultId", width: 38 },
    { header: "participant_id", key: "participantId", width: 38 },
    { header: "participant_name", key: "participantName", width: 26 },
    { header: "email", key: "email", width: 30 },
    { header: "employee_id", key: "employeeId", width: 18 },
    { header: "test_key", key: "testKey", width: 12 },
    { header: "test_name", key: "testName", width: 28 },
    { header: "result", key: "result", width: 28 },
    {
      header: "submitted_at",
      key: "submittedAt",
      width: 22,
      numFmt: "yyyy-mm-dd hh:mm",
    },
    { header: "duration_seconds", key: "duration", width: 18, numFmt: "0" },
    {
      header: "retention_until",
      key: "retentionUntil",
      width: 18,
      numFmt: "yyyy-mm-dd",
    },
    { header: "retention_status", key: "retentionStatus", width: 20 },
    { header: "source", key: "source", width: 20 },
    {
      header: "imported_at",
      key: "importedAt",
      width: 22,
      numFmt: "yyyy-mm-dd hh:mm",
    },
    { header: "imported_file_name", key: "importedFileName", width: 32 },
    { header: "imported_by", key: "importedBy", width: 28 },
  ]);
  for (const row of rows) {
    resultsSheet.addRow({
      resultId: row.id,
      participantId: row.participant?.id ?? "",
      participantName: safeText(
        row.participant?.name ??
          row.participantReference ??
          "Unlinked participant",
      ),
      email: safeText(row.participant?.email),
      employeeId: safeText(row.participant?.employeeId),
      testKey: row.testKey.toUpperCase(),
      testName: row.testName,
      result: row.resultLabel,
      submittedAt: new Date(row.submittedAt),
      duration: row.durationSeconds,
      retentionUntil: new Date(row.retentionUntil),
      retentionStatus: row.retentionStatus,
      source:
        row.source === "xlsx_import" ? "XLSX import" : "Participant assessment",
      importedAt: row.importedAt ? new Date(row.importedAt) : null,
      importedFileName: safeText(row.importedFileName),
      importedBy: safeText(row.importedBy?.name ?? row.importedBy?.email),
    });
  }

  const scoresSheet = workbook.addWorksheet("Dimension Scores");
  setExportColumns(scoresSheet, [
    { header: "result_id", key: "resultId", width: 38 },
    { header: "participant_id", key: "participantId", width: 38 },
    { header: "participant_name", key: "participantName", width: 26 },
    { header: "test_key", key: "testKey", width: 12 },
    { header: "dimension", key: "dimension", width: 24 },
    { header: "selected", key: "selected", width: 12 },
    { header: "left_score", key: "leftScore", width: 14, numFmt: "0.00" },
    { header: "right_score", key: "rightScore", width: 14, numFmt: "0.00" },
    { header: "raw_score", key: "rawScore", width: 14, numFmt: "0.00" },
    { header: "max_score", key: "maxScore", width: 14, numFmt: "0.00" },
    { header: "average", key: "average", width: 12, numFmt: "0.00" },
    { header: "score_percent", key: "percent", width: 16, numFmt: "0%" },
    { header: "band", key: "band", width: 14 },
  ]);
  for (const row of rows) {
    const dimensions = Array.isArray(row.scoreSummary?.dimensions)
      ? row.scoreSummary.dimensions
      : [];
    for (const dimensionValue of dimensions) {
      const dimension = dimensionValue as Record<string, unknown>;
      const percent =
        typeof dimension.scorePercent === "number"
          ? dimension.scorePercent / 100
          : null;
      scoresSheet.addRow({
        resultId: row.id,
        participantId: row.participant?.id ?? "",
        participantName: safeText(
          row.participant?.name ?? row.participantReference,
        ),
        testKey: row.testKey.toUpperCase(),
        dimension: safeText(dimension.label ?? dimension.code ?? dimension.key),
        selected: safeText(dimension.selected),
        leftScore:
          typeof dimension.leftScore === "number" ? dimension.leftScore : null,
        rightScore:
          typeof dimension.rightScore === "number"
            ? dimension.rightScore
            : null,
        rawScore:
          typeof dimension.rawScore === "number" ? dimension.rawScore : null,
        maxScore:
          typeof dimension.maxRawScore === "number"
            ? dimension.maxRawScore
            : null,
        average:
          typeof dimension.average === "number" ? dimension.average : null,
        percent,
        band: safeText(dimension.band),
      });
    }
  }

  const analysisSheet = workbook.addWorksheet("Analysis");
  setExportColumns(analysisSheet, [
    { header: "result_id", key: "resultId", width: 38 },
    { header: "participant_id", key: "participantId", width: 38 },
    { header: "participant_name", key: "participantName", width: 26 },
    { header: "test_key", key: "testKey", width: 12 },
    { header: "section", key: "section", width: 18 },
    { header: "field", key: "field", width: 28 },
    { header: "content", key: "content", width: 90 },
  ]);
  for (const row of rows) {
    for (const [section, source] of [
      ["result", row.scoredResult],
      ["interpretation", row.interpretation],
    ] as const) {
      for (const [field, value] of Object.entries(source ?? {})) {
        if (field === "traitProfiles" || field === "imagePath") {
          continue;
        }
        const content = readableValue(value);
        const exportRow = analysisSheet.addRow({
          resultId: row.id,
          participantId: row.participant?.id ?? "",
          participantName: safeText(
            row.participant?.name ?? row.participantReference,
          ),
          testKey: row.testKey.toUpperCase(),
          section,
          field,
          content,
        });
        const visualLines = content
          .split("\n")
          .reduce(
            (total, line) => total + Math.max(1, Math.ceil(line.length / 105)),
            0,
          );
        exportRow.height = Math.min(Math.max(28, visualLines * 15 + 8), 180);
      }
    }
  }
  analysisSheet.getColumn("content").alignment = {
    wrapText: true,
    vertical: "top",
  };

  const rawSheet = workbook.addWorksheet("Raw Answers");
  setExportColumns(rawSheet, [
    { header: "result_id", key: "resultId", width: 38 },
    { header: "participant_id", key: "participantId", width: 38 },
    { header: "participant_name", key: "participantName", width: 26 },
    { header: "test_key", key: "testKey", width: 12 },
    {
      header: "question_number",
      key: "questionNumber",
      width: 16,
      numFmt: "0",
    },
    { header: "question", key: "question", width: 64 },
    { header: "answer_value", key: "answerValue", width: 16 },
    { header: "answer_label", key: "answerLabel", width: 34 },
    {
      header: "question_time_seconds",
      key: "questionTime",
      width: 22,
      numFmt: "0",
    },
  ]);
  for (const row of rows) {
    const definition = getTestDefinition(row.testKey);
    if (!definition?.implemented) {
      continue;
    }
    for (const question of definition.questions) {
      const answer = row.rawAnswers[question.id] ?? "";
      rawSheet.addRow({
        resultId: row.id,
        participantId: row.participant?.id ?? "",
        participantName: safeText(
          row.participant?.name ?? row.participantReference,
        ),
        testKey: row.testKey.toUpperCase(),
        questionNumber: question.no,
        question: question.prompt,
        answerValue: answer,
        answerLabel:
          question.options.find((option) => option.value === answer)?.label ??
          "",
        questionTime: row.questionTimings[question.id] ?? null,
      });
    }
  }
  rawSheet.getColumn("question").alignment = {
    wrapText: true,
    vertical: "top",
  };
  rawSheet.getColumn("answerLabel").alignment = {
    wrapText: true,
    vertical: "top",
  };

  return workbookBuffer(workbook);
}

export function participantTemplateFileName() {
  return "talentmap-participant-import-template.xlsx";
}

export function resultImportTemplateFileName(testKey?: "bfi" | "mbti") {
  return `talentmap-${testKey ? `${testKey}-` : ""}result-import-template.xlsx`;
}

export function resultExportFileName(resultId: string | null) {
  return resultId
    ? `talentmap-result-${resultId}.xlsx`
    : `talentmap-results-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

import assert from "node:assert/strict";
import test from "node:test";

import ExcelJS from "exceljs";

import type { DashboardResultDetailDto } from "@/services/dashboard-service";
import type { ParticipantFieldDefinitionDto } from "@/services/participant-field-service";
import {
  participantResultTemplateLinks,
  resultImportTestLabel,
  resultImportTestLabelList,
} from "@/services/result-import-tests";
import {
  buildParticipantImportTemplate,
  buildResultExportWorkbook,
  buildResultImportTemplate,
  parseParticipantImportWorkbook,
  parseResultImportWorkbook,
  resultImportTestKeys,
} from "@/services/spreadsheet-workbook";
import { discDefinition } from "@/tests/instruments/disc/definition";
import { discPatternProfiles } from "@/tests/instruments/disc/profiles";
import {
  discForcedChoiceGroups,
  discQuestions,
} from "@/tests/instruments/disc/questions";
import { discTermGroups } from "@/tests/instruments/disc/terms";
import type { DiscDimensionCode } from "@/tests/instruments/disc/types";
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

function headerColumns(sheet: ExcelJS.Worksheet) {
  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    columns.set(String(cell.value ?? ""), columnNumber);
  });
  return columns;
}

function cellByHeader(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  header: string,
) {
  const columnNumber = headerColumns(sheet).get(header);
  assert.ok(columnNumber, `Column "${header}" is missing from ${sheet.name}.`);
  return sheet.getCell(rowNumber, columnNumber).value;
}

function sheetEntries(sheet: ExcelJS.Worksheet, headers: string[]) {
  const columns = headerColumns(sheet);
  const rows: Array<Record<string, string>> = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const entry: Record<string, string> = {};
    for (const header of headers) {
      const columnNumber = columns.get(header);
      assert.ok(
        columnNumber,
        `Column "${header}" is missing from ${sheet.name}.`,
      );
      entry[header] = String(
        sheet.getCell(rowNumber, columnNumber).value ?? "",
      );
    }
    rows.push(entry);
  }
  return rows;
}

const discGroups = new Map(discTermGroups.map((group) => [group.group, group]));

function discPosition(groupNumber: number, code: DiscDimensionCode) {
  const term = discGroups
    .get(groupNumber)
    ?.terms.find((candidate) => candidate.dimension === code);
  assert.ok(term, `DISC group ${groupNumber} has no ${code} term.`);
  return term.position;
}

/**
 * One answer per DISC question, picking the named dimension's word on the MOST
 * side and another dimension's word on the LEAST side. Positions are read from
 * the item bank rather than hard-coded, so the fixture follows the bank instead
 * of duplicating it, and the resulting profile is deliberately lopsided.
 */
function discAnswers(most: DiscDimensionCode, least: DiscDimensionCode) {
  return Object.fromEntries(
    discQuestions.map((question) => [
      question.id,
      discPosition(question.group, question.kind === "most" ? most : least),
    ]),
  );
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

test("offers a per-participant template link for every importable instrument", () => {
  // DISC was importable end to end - route, builder and parser - while the
  // per-participant screen still listed only BFI and MBTI by hand, so the only
  // way to get a prefilled DISC workbook was to edit the query string. The links
  // are now derived from the key list; this pins that they stay in step.
  const links = participantResultTemplateLinks(participantId);

  assert.equal(links.length, resultImportTestKeys.length);

  const linkedKeys = links.map((link) => {
    const url = new URL(link.href, "https://talentmap.test");

    assert.equal(url.pathname, "/api/dashboard/import/templates/results");
    assert.equal(
      url.searchParams.get("participantId"),
      participantId,
      `${link.label} must prefill the participant`,
    );
    assert.ok(link.label.trim().length > 0);

    return url.searchParams.get("testKey");
  });

  assert.deepEqual([...linkedKeys].sort(), [...resultImportTestKeys].sort());

  // The bulk-import panel's prose is generated from the same list, so it cannot
  // go on describing the upload as BFI or MBTI only.
  const prose = resultImportTestLabelList();
  for (const testKey of resultImportTestKeys) {
    assert.ok(
      prose.includes(resultImportTestLabel(testKey)),
      `panel copy must name ${testKey}: ${prose}`,
    );
  }
});

test("result template covers every importable instrument", async () => {
  const workbook = await loadWorkbook(await buildResultImportTemplate({}));
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    [
      "Instructions",
      "BFI Results",
      "MBTI Results",
      "DISC Results",
      "Participant IDs",
      "Question Guide",
    ],
  );
  // The guide holds one row per question across every instrument, so it grows
  // with the banks instead of assuming a fixed count.
  const questionCount = resultImportTestKeys.reduce(
    (total, testKey) => total + getTestDefinition(testKey).questions.length,
    0,
  );
  const guide = workbook.getWorksheet("Question Guide");
  assert.ok(guide);
  assert.equal(guide.rowCount, questionCount + 1);
  const guideKeys = new Set(
    sheetEntries(guide, ["test_key"]).map((entry) => entry.test_key),
  );
  assert.deepEqual(
    [...guideKeys].sort(),
    resultImportTestKeys.map((testKey) => testKey.toUpperCase()).sort(),
  );
  assert.deepEqual(
    workbook.getWorksheet("BFI Results")?.getCell("D2").dataValidation
      ?.formulae,
    ['"1,2,3,4,5"'],
  );
  assert.deepEqual(
    workbook.getWorksheet("MBTI Results")?.getCell("D2").dataValidation
      ?.formulae,
    ['"A,B"'],
  );
  assert.deepEqual(
    workbook.getWorksheet("DISC Results")?.getCell("D2").dataValidation
      ?.formulae,
    ['"A,B,C,D"'],
  );
});

test("profile result template parses a complete DISC response row", async () => {
  const definition = getTestDefinition("disc");
  // The template reads the registry, so an unwired DISC entry surfaces here
  // rather than as a puzzling column mismatch further down.
  assert.equal(definition.questions.length, 56);

  const workbook = await loadWorkbook(
    await buildResultImportTemplate({ participantId, testKey: "disc" }),
  );
  const sheet = workbook.getWorksheet("DISC Results");
  assert.ok(sheet);
  assert.equal(sheet.columnCount, 59);
  assert.equal(headerColumns(sheet).get("q56"), 59);
  // Validation must reach the last of the 56 answer columns, not just the
  // first one.
  assert.deepEqual(sheet.getCell(2, 59).dataValidation?.formulae, [
    '"A,B,C,D"',
  ]);
  assert.equal(
    sheet.getCell(2, 59).dataValidation?.error,
    "Use A, B, C, or D.",
  );

  sheet.getCell("B2").value = new Date("2026-07-21T02:15:00.000Z");
  sheet.getCell("C2").value = 900;
  const answers = discAnswers("D", "S");
  definition.questions.forEach((question, index) => {
    sheet.getCell(2, index + 4).value = answers[question.id];
  });

  const parsed = await parseResultImportWorkbook(
    await writeWorkbook(workbook),
    participantId,
  );
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0]?.sheet, "DISC Results");
  assert.equal(parsed.rows[0]?.testKey, "disc");
  assert.equal(parsed.rows[0]?.participantId, participantId);
  assert.equal(parsed.rows[0]?.durationSeconds, 900);
  assert.deepEqual(parsed.rows[0]?.answers, answers);
  // The import service scores every parsed row, so the row must be scoreable.
  assert.equal(
    definition.score(parsed.rows[0]?.answers ?? {}).summary.model,
    "DISC",
  );
});

test("result parser reports the exact cell for an invalid DISC answer", async () => {
  const workbook = await loadWorkbook(
    await buildResultImportTemplate({ participantId, testKey: "disc" }),
  );
  const sheet = workbook.getWorksheet("DISC Results");
  assert.ok(sheet);
  const definition = getTestDefinition("disc");
  const answers = discAnswers("I", "C");
  definition.questions.forEach((question, index) => {
    sheet.getCell(2, index + 4).value = answers[question.id];
  });
  // Column 30 is q27, the MOST side of group 14. "E" is outside A-D.
  sheet.getCell(2, 30).value = "E";

  const parsed = await parseResultImportWorkbook(
    await writeWorkbook(workbook),
    participantId,
  );
  assert.deepEqual(parsed.issues, [
    {
      sheet: "DISC Results",
      row: 2,
      column: "q27",
      message: "Use one of: A, B, C, D.",
    },
  ]);
});

test("result parser rejects a DISC row that marks one word both Most and Least", async () => {
  const workbook = await loadWorkbook(
    await buildResultImportTemplate({ participantId, testKey: "disc" }),
  );
  const sheet = workbook.getWorksheet("DISC Results");
  assert.ok(sheet);
  const definition = getTestDefinition("disc");
  const answers = discAnswers("D", "S");
  definition.questions.forEach((question, index) => {
    sheet.getCell(2, index + 4).value = answers[question.id];
  });
  // Column 20 is q17, the MOST side of group 9; column 21 is q18, its LEAST
  // side. Copying one into the other leaves every cell individually valid - both
  // are still A-D - so only the group rule can catch this row.
  sheet.getCell(2, 21).value = sheet.getCell(2, 20).value;

  const parsed = await parseResultImportWorkbook(
    await writeWorkbook(workbook),
    participantId,
  );

  assert.deepEqual(parsed.issues, [
    {
      sheet: "DISC Results",
      row: 2,
      column: "q18",
      message:
        "Group 9 cannot use the same word for Most and Least. Change this cell or q17.",
    },
  ]);
  // Scoring tolerates the pair on purpose so a legacy stored result still
  // renders, which is why the import service's score() call cannot be the gate:
  // this row scores cleanly and would otherwise import in silence.
  assert.equal(
    definition.score({ ...answers, g09l: answers.g09m }).summary
      .ambiguousGroups,
    1,
  );
});

test("round-trips the 56 stored DISC ids through the q01..q56 columns", async () => {
  // The grid changed what a DISC screen looks like, not what is stored. This walks
  // the whole width of the sheet by column NAME and varies the letter per group, so
  // a shifted, swapped, or collapsed q(2N-1)/q(2N) mapping cannot pass.
  const definition = getTestDefinition("disc");
  const workbook = await loadWorkbook(
    await buildResultImportTemplate({ participantId, testKey: "disc" }),
  );
  const sheet = workbook.getWorksheet("DISC Results");
  assert.ok(sheet);
  const columns = headerColumns(sheet);

  sheet.getCell("B2").value = new Date("2026-07-22T03:00:00.000Z");
  sheet.getCell("C2").value = 780;

  const positions = ["A", "B", "C", "D"];
  const expected: Record<string, string> = {};

  for (const group of discForcedChoiceGroups) {
    // Two positions apart, so the two sides of a group always differ.
    const most = positions[(group.group - 1) % 4];
    const least = positions[(group.group + 1) % 4];
    expected[group.mostQuestionId] = most;
    expected[group.leastQuestionId] = least;

    for (const [questionNumber, value] of [
      [group.group * 2 - 1, most],
      [group.group * 2, least],
    ] as const) {
      const header = `q${String(questionNumber).padStart(2, "0")}`;
      const columnNumber = columns.get(header);
      assert.ok(columnNumber, `Column "${header}" is missing.`);
      sheet.getCell(2, columnNumber).value = value;
    }
  }

  assert.equal(Object.keys(expected).length, 56);

  const parsed = await parseResultImportWorkbook(
    await writeWorkbook(workbook),
    participantId,
  );

  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.rows.length, 1);
  // Keyed by the individual question ids, g01m/g01l .. g28l, with A-D values.
  assert.deepEqual(parsed.rows[0]?.answers, expected);
  assert.equal(
    definition.score(parsed.rows[0]?.answers ?? {}).summary.ambiguousGroups,
    0,
  );
});

test("reports every conflicting DISC group by sheet, row, and column", async () => {
  const definition = getTestDefinition("disc");
  const workbook = await loadWorkbook(
    await buildResultImportTemplate({ participantId, testKey: "disc" }),
  );
  const sheet = workbook.getWorksheet("DISC Results");
  assert.ok(sheet);
  const columns = headerColumns(sheet);
  const answers = discAnswers("D", "S");

  function answerColumn(questionNumber: number) {
    const header = `q${String(questionNumber).padStart(2, "0")}`;
    const columnNumber = columns.get(header);
    assert.ok(columnNumber, `Column "${header}" is missing.`);
    return columnNumber;
  }

  // Two rows, each conflicting in different groups, so a hardcoded row number or a
  // conflict reported against the wrong group cannot pass.
  for (const [rowNumber, conflictGroups] of [
    [2, [9, 22]],
    [3, [1]],
  ] as const) {
    sheet.getCell(rowNumber, 2).value = new Date("2026-07-22T03:00:00.000Z");
    sheet.getCell(rowNumber, 3).value = 900;
    definition.questions.forEach((question, index) => {
      sheet.getCell(rowNumber, index + 4).value = answers[question.id];
    });

    for (const groupNumber of conflictGroups) {
      sheet.getCell(rowNumber, answerColumn(groupNumber * 2)).value =
        sheet.getCell(rowNumber, answerColumn(groupNumber * 2 - 1)).value;
    }
  }

  const parsed = await parseResultImportWorkbook(
    await writeWorkbook(workbook),
    participantId,
  );

  assert.deepEqual(parsed.issues, [
    {
      sheet: "DISC Results",
      row: 2,
      column: "q18",
      message:
        "Group 9 cannot use the same word for Most and Least. Change this cell or q17.",
    },
    {
      sheet: "DISC Results",
      row: 2,
      column: "q44",
      message:
        "Group 22 cannot use the same word for Most and Least. Change this cell or q43.",
    },
    {
      sheet: "DISC Results",
      row: 3,
      column: "q02",
      message:
        "Group 1 cannot use the same word for Most and Least. Change this cell or q01.",
    },
  ]);
  // Both rows parse and both would score, which is exactly why the issues above
  // are the gate: importResultsFromWorkbook refuses any workbook that reports one.
  assert.equal(parsed.rows.length, 2);
});

test("result export populates DISC summary, dimension, and analysis rows", async () => {
  const answers = discAnswers("D", "S");
  const score = discDefinition.score(answers);
  const result: DashboardResultDetailDto = {
    id: resultId,
    testKey: "disc",
    testName: discDefinition.name,
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
    importedAt: "2026-07-21T02:15:00.000Z",
    importedFileName: "disc-results.xlsx",
    resultLabel: score.summary.label,
    submittedAt: "2026-07-21T02:15:00.000Z",
    retentionUntil: "2027-07-21T02:15:00.000Z",
    retentionStatus: "active",
    tokenId: null,
    tokenPreview: null,
    importedBy: {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Rina Admin",
      email: "rina@example.com",
    },
    testVersion: discDefinition.version,
    rawAnswers: answers,
    questionTimings: { [discQuestions[0]?.id ?? "g01m"]: 6 },
    durationSeconds: 900,
    scoredResult: score.result,
    scoreSummary: score.summary,
    interpretation: score.interpretation,
  };

  const workbook = await loadWorkbook(
    await buildResultExportWorkbook([result]),
  );
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Instructions", "Results", "Dimension Scores", "Analysis", "Raw Answers"],
  );

  const resultsSheet = workbook.getWorksheet("Results");
  assert.ok(resultsSheet);
  assert.equal(cellByHeader(resultsSheet, 2, "test_key"), "DISC");
  assert.equal(cellByHeader(resultsSheet, 2, "test_name"), discDefinition.name);
  assert.equal(cellByHeader(resultsSheet, 2, "result"), score.summary.label);
  assert.match(String(score.summary.label), /^.+ \((D|DI|DS|DC)\)$/);

  const scoresSheet = workbook.getWorksheet("Dimension Scores");
  assert.ok(scoresSheet);
  assert.equal(scoresSheet.rowCount, score.summary.dimensions.length + 1);
  score.summary.dimensions.forEach((dimension, index) => {
    const rowNumber = index + 2;
    const value = (header: string) =>
      cellByHeader(scoresSheet, rowNumber, header);
    assert.equal(value("test_key"), "DISC");
    assert.equal(value("dimension"), dimension.label);
    assert.equal(value("code"), dimension.code);
    assert.equal(value("most_score"), dimension.mostScore);
    assert.equal(value("least_score"), dimension.leastScore);
    assert.equal(value("change_score"), dimension.changeScore);
    assert.equal(value("public_segment"), dimension.publicSegment);
    assert.equal(value("private_segment"), dimension.privateSegment);
    assert.equal(value("segment"), dimension.segment);
    assert.equal(value("score_percent"), dimension.scorePercent / 100);
    assert.equal(value("band"), dimension.band);
    // The BFI and MBTI columns stay empty rather than reporting a zero score.
    assert.equal(value("raw_score") ?? null, null);
    assert.equal(value("average") ?? null, null);
    assert.equal(value("selected") ?? "", "");
  });
  // A Most tally of zero must still be written as 0, not left blank.
  assert.ok(
    score.summary.dimensions.some((dimension) => dimension.mostScore === 0),
  );

  const analysisSheet = workbook.getWorksheet("Analysis");
  assert.ok(analysisSheet);
  const analysis = sheetEntries(analysisSheet, [
    "test_key",
    "section",
    "field",
    "content",
  ]);
  const fields = analysis.map((entry) => entry.field);
  for (const field of [
    "name",
    "epithet",
    "description",
    "patternKey",
    "primaryDimension",
    "secondaryDimension",
    "generalTraits",
    "strengths",
    "potentialProblemAreas",
    "graph_public",
    "graph_private",
    "graph_perceived",
    "overview",
    "workplaceSummary",
    "communicationTips",
    "motivators",
    "stressBehaviors",
    "developmentTips",
    "responseStyle",
    "methodology",
    "disclaimer",
  ]) {
    assert.ok(fields.includes(field), `Analysis is missing "${field}".`);
  }
  // Structured arrays are exported through their own rows, never as blobs.
  assert.ok(!fields.includes("dimensionProfiles"));
  assert.ok(!fields.includes("graphs"));
  for (const entry of analysis) {
    assert.equal(entry.test_key, "DISC");
    assert.ok(entry.content.trim(), `Analysis row "${entry.field}" is blank.`);
    assert.ok(!entry.content.includes("[object Object]"));
  }
  // This fixture elevates one dimension only, so there is no secondary
  // dimension; the row must say so instead of exporting an empty cell.
  assert.equal(score.summary.secondary, null);
  assert.equal(
    analysis.find((entry) => entry.field === "secondaryDimension")?.content,
    "None",
  );

  const perceived = analysis.find((entry) => entry.field === "graph_perceived");
  assert.ok(perceived);
  assert.equal(perceived.section, "result");
  assert.ok(perceived.content.startsWith("Perceived self"));
  for (const dimension of score.summary.dimensions) {
    const plotted =
      `${dimension.label} (${dimension.code}): ` +
      `${dimension.changeScore} · segment ${dimension.segment}`;
    assert.ok(
      perceived.content.includes(plotted),
      `The perceived graph is missing ${dimension.code}.`,
    );
  }

  assert.equal(workbook.getWorksheet("Raw Answers")?.rowCount, 57);
  const rawSheet = workbook.getWorksheet("Raw Answers");
  assert.ok(rawSheet);
  assert.equal(cellByHeader(rawSheet, 2, "question_number"), 1);
  assert.equal(
    cellByHeader(rawSheet, 2, "answer_value"),
    answers[discQuestions[0]?.id ?? "g01m"],
  );
  assert.ok(String(cellByHeader(rawSheet, 2, "answer_label")).trim());
});

/** A DISC export row, so the graph tests below can vary only what they mean to. */
function discExportRow(
  answers: Record<string, string>,
): DashboardResultDetailDto {
  const score = discDefinition.score(answers);

  return {
    id: resultId,
    testKey: "disc",
    testName: discDefinition.name,
    participant: {
      id: participantId,
      name: "Avery Tan",
      email: "avery@example.com",
      employeeId: "00127",
      status: "active",
      profileHref: `/dashboard/participants/${participantId}`,
    },
    participantReference: null,
    source: "platform_assessment",
    importedAt: null,
    importedFileName: null,
    resultLabel: score.summary.label,
    submittedAt: "2026-07-21T02:15:00.000Z",
    retentionUntil: "2027-07-21T02:15:00.000Z",
    retentionStatus: "active",
    tokenId: null,
    tokenPreview: null,
    importedBy: null,
    testVersion: discDefinition.version,
    rawAnswers: answers,
    questionTimings: {},
    durationSeconds: 900,
    scoredResult: score.result,
    scoreSummary: score.summary,
    interpretation: score.interpretation,
  };
}

test("result export carries the intensity every DISC graph plots", async () => {
  // The segment alone cannot reproduce a graph: two dimensions sharing a segment
  // sit at different heights, so an export without the intensity is an export the
  // graph cannot be rebuilt from. This pins all three per dimension.
  const answers = discAnswers("I", "C");
  const row = discExportRow(answers);
  const score = discDefinition.score(answers);

  const workbook = await loadWorkbook(await buildResultExportWorkbook([row]));
  const scoresSheet = workbook.getWorksheet("Dimension Scores");
  assert.ok(scoresSheet);
  assert.equal(scoresSheet.rowCount, score.summary.dimensions.length + 1);

  score.summary.dimensions.forEach((dimension, index) => {
    const rowNumber = index + 2;
    const value = (header: string) =>
      cellByHeader(scoresSheet, rowNumber, header);

    for (const [intensityHeader, segmentHeader, intensity, segment] of [
      [
        "public_intensity",
        "public_segment",
        dimension.publicIntensity,
        dimension.publicSegment,
      ],
      [
        "private_intensity",
        "private_segment",
        dimension.privateIntensity,
        dimension.privateSegment,
      ],
      ["intensity", "segment", dimension.intensity, dimension.segment],
    ] as const) {
      assert.equal(
        value(intensityHeader),
        intensity,
        `${dimension.code} ${intensityHeader}`,
      );
      // The segment is the intensity in bands of four, so a row whose two
      // columns disagree would be a graph drawn in the wrong band.
      assert.equal(Math.ceil(intensity / 4), segment);
      assert.equal(value(segmentHeader), segment);
    }
  });

  const analysis = sheetEntries(workbook.getWorksheet("Analysis")!, [
    "section",
    "field",
    "content",
  ]);

  for (const graph of score.result.graphs) {
    const entry = analysis.find((item) => item.field === `graph_${graph.key}`);
    assert.ok(entry, `Analysis is missing graph_${graph.key}.`);
    assert.equal(entry.section, "result");
    assert.ok(
      entry.content.includes(`Segment numbers (D-I-S-C): ${graph.segmentLabel}`),
      `graph_${graph.key} is missing its segment tuple.`,
    );
    // The derived pattern must never be passed off as the licensed DiSC Classic
    // classical-pattern name, so the row carries the disclaimer on its face.
    assert.ok(
      entry.content.includes(
        `TalentMap pattern: ${graph.patternName} (${graph.patternKey}).`,
      ),
      `graph_${graph.key} is missing its derived pattern.`,
    );
    assert.ok(
      entry.content.includes("not the DiSC Classic classical pattern name"),
    );

    for (const point of graph.points) {
      assert.ok(
        entry.content.includes(
          `(${point.code}): ${point.value} · segment ${point.segment} · intensity ${point.intensity} of 28`,
        ),
        `graph_${graph.key} is missing ${point.code}.`,
      );
    }
  }
});

test("result export reprints the DISC report's own field list", async () => {
  // An operator migrating from an existing DiSC report looks for "Judges others
  // by", not for judgesOthersBy, so the report section is keyed by the printed
  // label and carries the same twelve fields in the same order as the on-screen
  // report.
  const answers = discAnswers("S", "D");
  const row = discExportRow(answers);
  const score = discDefinition.score(answers);
  const pattern = discPatternProfiles[score.summary.patternKey];

  const workbook = await loadWorkbook(await buildResultExportWorkbook([row]));
  const analysis = sheetEntries(workbook.getWorksheet("Analysis")!, [
    "section",
    "field",
    "content",
  ]);
  const report = analysis.filter((entry) => entry.section === "report");

  assert.deepEqual(
    report.map((entry) => entry.field),
    [
      "Segment",
      "Pattern",
      "Emotions",
      "Goal",
      "Judges others by",
      "Influences others by",
      "Value to the organization",
      "Overuses",
      "Under pressure",
      "Fears",
      "Would increase effectiveness through",
      "Description",
    ],
  );

  const content = (field: string) =>
    report.find((entry) => entry.field === field)?.content ?? "";

  const perceived = score.result.graphs.find(
    (graph) => graph.key === "perceived",
  );
  assert.ok(perceived);
  assert.ok(content("Segment").startsWith(`${perceived.segmentLabel}\n`));
  assert.ok(
    content("Pattern").startsWith(
      `${score.result.name} (${score.summary.patternKey})\n`,
    ),
  );
  assert.ok(
    content("Pattern").includes(
      "not the DiSC Classic classical pattern name",
    ),
  );
  assert.equal(content("Emotions"), pattern.emotionalTone);
  assert.equal(content("Goal"), pattern.motivation);
  assert.equal(content("Judges others by"), pattern.judgesOthersBy);
  assert.equal(content("Influences others by"), pattern.influencesOthersBy);
  assert.equal(content("Value to the organization"), pattern.organizationValue);
  assert.equal(content("Overuses"), pattern.overuses);
  assert.equal(content("Under pressure"), pattern.underPressure);
  assert.equal(content("Fears"), pattern.fears);
  assert.equal(
    content("Would increase effectiveness through"),
    pattern.effectiveness,
  );
  assert.equal(content("Description"), score.result.description);

  // The nine strings now travel on the payload as result.patternDetail, which the
  // export prefers over the lookup, so a record exports what its reader was shown.
  assert.deepEqual(score.result.patternDetail, {
    emotionalTone: pattern.emotionalTone,
    motivation: pattern.motivation,
    judgesOthersBy: pattern.judgesOthersBy,
    influencesOthersBy: pattern.influencesOthersBy,
    organizationValue: pattern.organizationValue,
    overuses: pattern.overuses,
    underPressure: pattern.underPressure,
    fears: pattern.fears,
    effectiveness: pattern.effectiveness,
  });

  // And it is printed once, under the report's own labels. Letting the generic
  // result dump reach it too would repeat all nine paragraphs a few rows later
  // under their machine names.
  assert.ok(
    !analysis.some((entry) => entry.field === "patternDetail"),
    "patternDetail must not be dumped again in the result section",
  );

  const storedOnly = {
    ...row,
    // A pattern key this build does not have, so the lookup returns nothing and
    // only the stored narrative can supply these rows.
    scoreSummary: { ...score.summary, patternKey: "XZ" },
    scoredResult: {
      ...score.result,
      patternDetail: { ...score.result.patternDetail, fears: "Being unheard." },
    },
  } as unknown as DashboardResultDetailDto;
  const storedReport = sheetEntries(
    (await loadWorkbook(await buildResultExportWorkbook([storedOnly]))).getWorksheet(
      "Analysis",
    )!,
    ["section", "field", "content"],
  ).filter((entry) => entry.section === "report");

  assert.equal(
    storedReport.find((entry) => entry.field === "Fears")?.content,
    "Being unheard.",
    "the stored narrative must win over the lookup",
  );
  assert.equal(
    storedReport.find((entry) => entry.field === "Emotions")?.content,
    pattern.emotionalTone,
    "the other stored fields still export",
  );
});

test("leaves the DISC-only export additions out of a BFI result", async () => {
  // The DISC work extends a sheet BFI and MBTI share. Their rows must be
  // untouched by it: no report section, no graph rows, and the three new
  // columns empty rather than zeroed.
  const definition = getTestDefinition("bfi");
  const answers = Object.fromEntries(
    definition.questions.map((question) => [
      question.id,
      question.options[0]?.value ?? "1",
    ]),
  );
  const score = definition.score(answers);
  const row: DashboardResultDetailDto = {
    ...discExportRow(discAnswers("D", "S")),
    testKey: "bfi",
    testName: definition.name,
    testVersion: definition.version,
    resultLabel: "BFI profile",
    rawAnswers: answers,
    scoredResult: score.result,
    scoreSummary: score.summary,
    interpretation: score.interpretation ?? null,
  };

  const workbook = await loadWorkbook(await buildResultExportWorkbook([row]));
  const scoresSheet = workbook.getWorksheet("Dimension Scores");
  assert.ok(scoresSheet);
  assert.ok(Array.isArray(score.summary.dimensions));
  assert.equal(scoresSheet.rowCount, score.summary.dimensions.length + 1);

  for (let rowNumber = 2; rowNumber <= scoresSheet.rowCount; rowNumber += 1) {
    // The BFI columns still carry their values.
    assert.ok(cellByHeader(scoresSheet, rowNumber, "raw_score") !== null);
    for (const header of ["public_intensity", "private_intensity", "intensity"]) {
      assert.equal(
        cellByHeader(scoresSheet, rowNumber, header) ?? null,
        null,
        `${header} must stay empty for BFI.`,
      );
    }
  }

  const analysis = sheetEntries(workbook.getWorksheet("Analysis")!, [
    "section",
    "field",
  ]);
  assert.deepEqual(
    [...new Set(analysis.map((entry) => entry.section))].sort(),
    ["interpretation", "result"],
  );
  assert.ok(!analysis.some((entry) => entry.field.startsWith("graph_")));
});

test("leaves the DISC-only export additions out of an MBTI result", async () => {
  // MBTI shares the same five sheets, and its Dimension Scores rows use a third
  // set of columns again - selected, left_score, right_score - so the DISC
  // additions have to leave it exactly as it was.
  const definition = getTestDefinition("mbti");
  const answers = Object.fromEntries(
    definition.questions.map((question) => [
      question.id,
      question.options[0]?.value ?? "1",
    ]),
  );
  const score = definition.score(answers);
  const row: DashboardResultDetailDto = {
    ...discExportRow(discAnswers("D", "S")),
    testKey: "mbti",
    testName: definition.name,
    testVersion: definition.version,
    resultLabel: "MBTI type",
    rawAnswers: answers,
    scoredResult: score.result,
    scoreSummary: score.summary,
    interpretation: score.interpretation ?? null,
  };

  const workbook = await loadWorkbook(await buildResultExportWorkbook([row]));

  // The sheet split is shared, so a DISC-only sheet would show up here.
  assert.deepEqual(
    workbook.worksheets.map((sheet) => sheet.name),
    ["Instructions", "Results", "Dimension Scores", "Analysis", "Raw Answers"],
  );

  const scoresSheet = workbook.getWorksheet("Dimension Scores");
  assert.ok(scoresSheet);
  assert.ok(Array.isArray(score.summary.dimensions));
  assert.equal(scoresSheet.rowCount, score.summary.dimensions.length + 1);

  score.summary.dimensions.forEach((dimensionValue, index) => {
    const dimension = dimensionValue as Record<string, unknown>;
    const rowNumber = index + 2;

    // MBTI's own columns still carry its values.
    assert.equal(
      cellByHeader(scoresSheet, rowNumber, "code"),
      dimension.code,
    );
    assert.equal(
      cellByHeader(scoresSheet, rowNumber, "selected"),
      dimension.selected,
    );
    assert.equal(
      cellByHeader(scoresSheet, rowNumber, "left_score"),
      dimension.leftScore,
    );
    assert.equal(
      cellByHeader(scoresSheet, rowNumber, "right_score"),
      dimension.rightScore,
    );

    // Empty rather than zeroed: a zero would read as a measured intensity of
    // zero, which is not a value the DISC scale even has.
    for (const header of [
      "public_intensity",
      "private_intensity",
      "intensity",
      "public_segment",
      "private_segment",
      "segment",
    ]) {
      assert.equal(
        cellByHeader(scoresSheet, rowNumber, header) ?? null,
        null,
        `${header} must stay empty for MBTI.`,
      );
    }
  });

  const analysis = sheetEntries(workbook.getWorksheet("Analysis")!, [
    "section",
    "field",
  ]);
  assert.deepEqual(
    [...new Set(analysis.map((entry) => entry.section))].sort(),
    ["interpretation", "result"],
  );
  assert.ok(!analysis.some((entry) => entry.field.startsWith("graph_")));
  assert.ok(
    !analysis.some((entry) => entry.field === "Judges others by"),
    "the DISC report field list must not reach an MBTI export",
  );
});

test("Dimension Scores keeps every pre-existing column at its own position", async () => {
  // This sheet is shared by every instrument, and an operator's saved formula or
  // Power Query points at a column LETTER, not at a header. Filing DISC's columns
  // beside their nearest relatives moved score_percent from L to S and band from M
  // to T for BFI and MBTI exports too, so a percentile formula reading L silently
  // returned a 0-5 mean instead of a percentage - wrong numbers, no error.
  //
  // The fix is to append. This pins the first thirteen positions so the next new
  // column cannot be inserted in the middle either; add new ones after `band`.
  const settled = [
    "result_id",
    "participant_id",
    "participant_name",
    "test_key",
    "dimension",
    "selected",
    "left_score",
    "right_score",
    "raw_score",
    "max_score",
    "average",
    "score_percent",
    "band",
  ];

  const workbook = await loadWorkbook(
    await buildResultExportWorkbook([discExportRow(discAnswers("D", "S"))]),
  );
  const scoresSheet = workbook.getWorksheet("Dimension Scores");
  assert.ok(scoresSheet);
  const columns = headerColumns(scoresSheet);

  settled.forEach((header, index) => {
    assert.equal(
      columns.get(header),
      index + 1,
      `${header} must stay at column ${index + 1}`,
    );
  });

  // Everything DISC added sits after them.
  for (const header of [
    "code",
    "most_score",
    "least_score",
    "change_score",
    "public_intensity",
    "public_segment",
    "private_intensity",
    "private_segment",
    "intensity",
    "segment",
  ]) {
    const position = columns.get(header);
    assert.ok(position, `${header} is missing`);
    assert.ok(
      position > settled.length,
      `${header} must be appended, not inserted at ${position}`,
    );
  }
});

test("Instructions rows are tall enough for the text they hold", async () => {
  // The DISC answer-format note is 420 characters and is the only place any
  // template states that a word may not be both MOST and LEAST. Breaking that rule
  // makes importResultsFromWorkbook reject the whole workbook, so a row height that
  // clipped the sentence hid the one instruction that matters most.
  for (const testKey of [undefined, "disc" as const, "bfi" as const]) {
    const workbook = await loadWorkbook(
      await buildResultImportTemplate(
        testKey === undefined ? {} : { participantId, testKey },
      ),
    );
    const sheet = workbook.getWorksheet("Instructions");
    assert.ok(sheet);

    const width = sheet.getColumn(2).width ?? 0;
    assert.ok(width > 0, "the detail column must have a width");

    for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const value = sheet.getCell(rowNumber, 2).value;

      if (typeof value !== "string" || value.length === 0) {
        continue;
      }

      // Same approximation the sheet builder sizes rows with: at 15pt a line, a
      // row of height h shows floor(h / 15) lines.
      const lines = Math.ceil(value.length / 88);
      const height = sheet.getRow(rowNumber).height ?? 0;

      assert.ok(
        Math.floor(height / 15) >= lines,
        `${testKey ?? "all"} Instructions row ${rowNumber} shows ${Math.floor(
          height / 15,
        )} of ${lines} lines: "${value.slice(0, 60)}..."`,
      );
    }
  }
});

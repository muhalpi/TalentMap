/**
 * The instruments whose raw answers travel through the XLSX pipeline, and the
 * per-instrument copy the workbook and the dashboard both need.
 *
 * This lives apart from spreadsheet-workbook so that pages which only need to
 * offer a template link do not have to pull the workbook builder - and ExcelJS
 * with it - into their bundle. Every union over importable instruments reads from
 * this one list, so adding an instrument means adding a key here plus a
 * resultSheetConfig entry, and the download buttons, the query-parameter schema,
 * the template builder and the import parser all follow automatically.
 */
export const resultImportTestKeys = ["bfi", "mbti", "disc"] as const;

export type ResultImportTestKey = (typeof resultImportTestKeys)[number];

export interface ResultSheetConfig {
  sheetName: string;
  label: string;
  answerHint: string;
  formatNote: string;
}

export const resultSheetConfig = {
  bfi: {
    sheetName: "BFI Results",
    label: "Big Five",
    answerHint: "1, 2, 3, 4, or 5",
    formatNote:
      "BFI answers are 1 to 5. The Question Guide explains each scale value.",
  },
  mbti: {
    sheetName: "MBTI Results",
    label: "MBTI",
    answerHint: "A or B",
    formatNote:
      "MBTI answers are A or B. The Question Guide shows the answer text represented by each letter.",
  },
  disc: {
    sheetName: "DISC Results",
    label: "DISC",
    answerHint: "A, B, C, or D",
    formatNote:
      "DISC answers are A, B, C, or D. Each of the 28 word groups fills two columns: the first takes the word that describes the participant MOST and the second the word that describes them LEAST. The Question Guide lists the four words behind the letters for every group. The two letters in a group must differ: a word cannot be both MOST and LEAST, and a row that repeats a letter within a group is reported and not imported.",
  },
} as const satisfies Record<ResultImportTestKey, ResultSheetConfig>;

export function resultSheetName(testKey: ResultImportTestKey) {
  return resultSheetConfig[testKey].sheetName;
}

/** Short instrument name, for template buttons and panel copy. */
export function resultImportTestLabel(testKey: ResultImportTestKey) {
  return resultSheetConfig[testKey].label;
}

export interface ResultTemplateLink {
  href: string;
  label: string;
}

/**
 * One download button per importable instrument, prefilled with a participant.
 *
 * Built by mapping the key list rather than by listing buttons by hand, because a
 * hand-written list is how DISC ended up supported by the template route, the
 * workbook builder and the import parser while being unreachable from the
 * per-participant screen.
 */
export function participantResultTemplateLinks(
  participantId: string,
): ResultTemplateLink[] {
  return resultImportTestKeys.map((testKey) => ({
    href: `/api/dashboard/import/templates/results?participantId=${encodeURIComponent(
      participantId,
    )}&testKey=${testKey}`,
    label: `${resultImportTestLabel(testKey)} Template`,
  }));
}

/** "Big Five, MBTI, or DISC" - for prose that lists what an upload accepts. */
export function resultImportTestLabelList() {
  const labels = resultImportTestKeys.map(resultImportTestLabel);

  if (labels.length < 2) {
    return labels.join("");
  }

  return `${labels.slice(0, -1).join(", ")}, or ${labels[labels.length - 1]}`;
}

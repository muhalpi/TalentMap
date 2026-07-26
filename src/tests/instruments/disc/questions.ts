import type { ForcedChoiceGroup, PublicTestOption } from "@/tests/shared/types";

import { discTermGroups } from "./terms";

export interface DiscQuestionDefinition {
  id: string;
  no: number;
  group: number;
  kind: "most" | "least";
  prompt: string;
  options: PublicTestOption[];
}

const discGroupCount = discTermGroups.length;

/**
 * The single definition of a group's question-id stem, shared by the question
 * bank and by the forced-choice grid payload so the two cannot disagree about
 * which ids a group owns.
 */
function discGroupSlug(group: number): string {
  return `g${String(group).padStart(2, "0")}`;
}

function discGroupOptions(
  group: (typeof discTermGroups)[number],
): PublicTestOption[] {
  return group.terms.map((term) => ({
    value: term.position,
    label: term.term,
  }));
}

// Each of the 28 adjective groups is stored as two questions - "describes you
// MOST" and "describes you LEAST" - so draft autosave, resume, the submit route,
// scoring, and the XLSX q01..q56 round trip all work on a flat answer map. Both
// questions in a group offer the same four terms in the source display order, so
// A always labels the first listed term.
//
// The participant now meets a group as ONE screen with a Most and a Least column
// (see discForcedChoiceGroups below), but that is presentation only: these 56
// questions and their ids remain the storage contract, and the prompts below are
// still the per-question wording for anything that renders a single side.
//
// Option values are uppercase A/B/C/D on purpose: the XLSX import parser
// uppercases answer cells, so lowercase values would fail to match on import.
export const discQuestions: DiscQuestionDefinition[] = discTermGroups.flatMap(
  (group): DiscQuestionDefinition[] => {
    const options = discGroupOptions(group);
    const slug = discGroupSlug(group.group);

    return [
      {
        id: `${slug}m`,
        no: group.group * 2 - 1,
        group: group.group,
        kind: "most",
        prompt: `Group ${group.group} of 28 - which word describes you MOST?`,
        options,
      },
      {
        id: `${slug}l`,
        no: group.group * 2,
        group: group.group,
        kind: "least",
        prompt: `Group ${group.group} of 28 - which word describes you LEAST?`,
        options,
      },
    ];
  },
);

/**
 * `kind` above is the item's side, and `definition.ts` copies it onto the public
 * payload as `forcedChoiceSide`.
 *
 * That copy is what the participant screen reads to word its instruction - "pick
 * the word that is MOST like you" against "LEAST like you", which is not
 * interchangeable, because a respondent who follows a best-fit instruction on a
 * LEAST item inverts their own change scores. The screen must NOT reach into this
 * module for it: the same file holds `discTermGroups`, and that bank carries every
 * adjective's D/I/S/C keying, so importing it from a client component would ship
 * the answer key to anyone holding a test token.
 */

/**
 * The 28 groups as the participant meets them: one screen per group, with the
 * four shared adjectives as rows and a Most and a Least column.
 *
 * This is derived from `discTermGroups` and from the same id stem as
 * `discQuestions`, so it cannot drift from the item bank. It is presentation
 * metadata only - the instrument still defines 56 questions and still persists
 * 56 answers keyed g01m/g01l .. g28m/g28l with values "A".."D".
 */
export const discForcedChoiceGroups: ForcedChoiceGroup[] = discTermGroups.map(
  (group): ForcedChoiceGroup => {
    const slug = discGroupSlug(group.group);

    return {
      group: group.group,
      label: `Group ${group.group} of ${discGroupCount}`,
      options: discGroupOptions(group),
      mostQuestionId: `${slug}m`,
      leastQuestionId: `${slug}l`,
    };
  },
);

/**
 * WHERE THE EXCLUSIVITY RULE LIVES, for anyone looking for it here.
 *
 * DISC is ipsative: a group's contribution is the difference between the word
 * chosen as most like the respondent and the word chosen as least like them.
 * Picking the same word on both sides is not a preference, it is a contradiction
 * that nets to zero and silently drops that group out of the profile, so it is
 * rejected everywhere an answer can enter the system - the grid UI, draft save,
 * submit, and result import.
 *
 * The rule itself is not written here. This instrument declares that it applies,
 * with `exclusiveWithinGroup: true` in `definition.ts`, and every enforcement
 * point evaluates it with `forcedChoiceGroupConflicts` from
 * `@/tests/shared/forced-choice` against `discForcedChoiceGroups` above. One
 * implementation, so the four gates cannot disagree about which groups are
 * invalid, and no instrument-specific copy to keep in step with them.
 */

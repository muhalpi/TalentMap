import type { ForcedChoiceGroup } from "./types";

/**
 * One forced-choice group whose two sides carry the same option value.
 *
 * `value` is the option answered on both sides, e.g. `"C"`, kept so a caller can
 * name the word rather than only the group.
 */
export interface ForcedChoiceGroupConflict {
  group: number;
  mostQuestionId: string;
  leastQuestionId: string;
  value: string;
}

/**
 * THE definition of the exclusivity rule: a group is in conflict when both of
 * its sides are answered and both answers are the same option value.
 *
 * Every enforcement point reads the rule from here - the grid UI, draft save,
 * submit, and XLSX result import - so the client and the server cannot drift on
 * which groups are invalid. It takes the groups it should judge rather than
 * naming an instrument, which is what lets one implementation serve all four
 * call sites and any forced-choice instrument added later.
 *
 * Deliberately free of instrument imports. The grid runs in the participant's
 * browser, and the DISC item bank carries each adjective's D/I/S/C keying, so a
 * client-reachable module that imports it would ship the answer key to anyone
 * holding a test token.
 *
 * A group with only one side answered is never a conflict: drafts are
 * legitimately partial, and a half-filled group is a normal state on the way to a
 * complete one. An empty string counts as unanswered, because a cleared answer
 * arrives as `""` rather than as a missing key, and two empty sides must not read
 * as a match.
 *
 * Conflicts come back in the order the groups are given, which for every
 * instrument is ascending group order, so a message built from them lists groups
 * in the order the participant will visit them.
 */
export function forcedChoiceGroupConflicts(
  groups: ForcedChoiceGroup[],
  answers: Record<string, string | undefined>,
): ForcedChoiceGroupConflict[] {
  const conflicts: ForcedChoiceGroupConflict[] = [];

  for (const group of groups) {
    const most = answers[group.mostQuestionId];
    const least = answers[group.leastQuestionId];

    if (!most || !least || most !== least) {
      continue;
    }

    conflicts.push({
      group: group.group,
      mostQuestionId: group.mostQuestionId,
      leastQuestionId: group.leastQuestionId,
      value: most,
    });
  }

  return conflicts;
}

/**
 * The group numbers as a readable list - "Group 9", "Groups 9 and 14", "Groups
 * 9, 14 and 22".
 *
 * Shared so the sentence the participant reads in the runner and the sentence the
 * draft and submit gates throw are built the same way and cannot disagree about
 * grammar.
 */
export function forcedChoiceConflictGroupList(groupNumbers: number[]): string {
  if (groupNumbers.length === 0) {
    // Unreachable from the callers, which all check for conflicts first. Defined
    // anyway so a future caller cannot interpolate "Group undefined" into a
    // sentence shown to a participant.
    return "No group";
  }

  if (groupNumbers.length === 1) {
    return `Group ${groupNumbers[0]}`;
  }

  return `Groups ${groupNumbers.slice(0, -1).join(", ")} and ${
    groupNumbers[groupNumbers.length - 1]
  }`;
}

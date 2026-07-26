"use client";

import { useId } from "react";
import { Info, TriangleAlert } from "lucide-react";

import { forcedChoiceExclusivityRule } from "@/components/test/answer-instruction";
import { forcedChoiceGroupConflicts } from "@/tests/shared/forced-choice";
import type {
  ForcedChoiceGroup,
  ForcedChoiceSide,
  PublicTestOption,
} from "@/tests/shared/types";

const columnHeading: Record<ForcedChoiceSide, string> = {
  most: "Most",
  least: "Least",
};

/**
 * What the visible column headings leave implicit. Held once so the heading, the
 * heading's screen-reader completion, and every radio's accessible name are the
 * same words in the same order.
 */
const columnQualifier = "like me";

/**
 * First person, because this becomes part of each radio's accessible name -
 * "Neighborly - most like me". The column heading alone is not enough: a screen
 * reader user tabbing between radios must hear which side of the group they are
 * answering without having to inspect the table structure.
 */
function columnDescription(side: ForcedChoiceSide): string {
  return `${columnHeading[side].toLowerCase()} ${columnQualifier}`;
}

/**
 * Why a cell is unavailable. Referenced by `aria-describedby` from the disabled
 * radio, so the reason travels with the control instead of being inferred from
 * its dimmed appearance.
 */
function blockedReason(side: ForcedChoiceSide): string {
  return `Not available: this word is already marked ${columnDescription(
    side === "most" ? "least" : "most",
  )}.`;
}

/**
 * What a row's current state adds to the word in its header, for a screen reader.
 *
 * The blocked cell itself carries the same explanation through
 * `aria-describedby`, but a `disabled` radio cannot receive focus, so arrow-key
 * navigation skips it in silence and that description is never announced. The row
 * header is announced together with the word - in table navigation, and when
 * reading the row - so this is what tells the participant that the word is still
 * in the column and why it cannot be chosen there.
 */
function rowStateNote(isMost: boolean, isLeast: boolean): string | null {
  if (isMost && isLeast) {
    return `marked both ${columnDescription("most")} and ${columnDescription(
      "least",
    )}, which is not allowed`;
  }

  if (isMost) {
    return `marked ${columnDescription(
      "most",
    )}, so it is not available as ${columnDescription("least")}`;
  }

  if (isLeast) {
    return `marked ${columnDescription(
      "least",
    )}, so it is not available as ${columnDescription("most")}`;
  }

  return null;
}

/**
 * The id list for one cell's `aria-describedby`, skipping the descriptions that
 * do not apply to it. Always carries the rule line; a blocked cell also carries
 * the reason it is blocked, and a contradictory cell the contradiction.
 */
function describedByIds(...ids: (string | false | undefined)[]): string {
  return ids.filter(Boolean).join(" ");
}

function ForcedChoiceCell({
  blocked,
  checked,
  describedBy,
  name,
  onChoose,
  option,
  side,
}: {
  blocked: boolean;
  checked: boolean;
  describedBy: string;
  name: string;
  onChoose: (value: string) => void;
  option: PublicTestOption;
  side: ForcedChoiceSide;
}) {
  return (
    <td className="w-14 border-l border-slate-100 p-0 align-middle sm:w-20">
      {/* The label is the whole cell, so the touch target is the cell rather
          than the 20px radio glyph inside it. */}
      <label
        className={`flex min-h-11 w-full cursor-pointer items-center justify-center px-2 py-2 transition-colors ${
          checked
            ? "bg-blue-50 shadow-[inset_0_0_0_2px_#2563eb]"
            : blocked
              ? "cursor-not-allowed bg-slate-50"
              : "hover:bg-blue-50/60"
        }`}
      >
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={checked}
          disabled={blocked}
          onChange={() => onChoose(option.value)}
          aria-describedby={describedBy}
          className="size-5 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed"
        />
        <span className="sr-only">{`${option.label} - ${columnDescription(side)}`}</span>
      </label>
    </td>
  );
}

export interface ForcedChoiceGroupTableProps {
  group: ForcedChoiceGroup;
  /** Current answer for `group.mostQuestionId`, an `options[].value`. */
  mostValue?: string;
  /** Current answer for `group.leastQuestionId`, an `options[].value`. */
  leastValue?: string;
  /**
   * Blocks the whole group for a lasting reason - submission in flight - and
   * nothing else.
   *
   * Deliberately NOT set for the brief pause while the runner moves to the next
   * group: per HTML, an element that becomes disabled loses focus, so disabling
   * the fieldset that contains the just-used radio would blur it and leave the
   * participant on the next group with focus on `<body>`. A transient block is the
   * runner's own guard instead, which cannot move focus. Submission is safe to
   * disable because focus is on the Submit button, outside this fieldset.
   */
  disabled?: boolean;
  /**
   * `true` when the surrounding page already shows a visible warning for a group
   * that holds one word on both sides, so this component keeps its explanation as
   * a screen-reader description on the two contradictory radios instead of adding
   * a second red panel and a second live-region announcement for one problem.
   */
  conflictReportedElsewhere?: boolean;
  onSelect: (questionId: string, value: string) => void;
}

/**
 * One forced-choice group as a four-row table: the shared words down the Term
 * column, a Most column, and a Least column.
 *
 * PRESENTATION ONLY. The two columns are two ordinary questions -
 * `group.mostQuestionId` and `group.leastQuestionId` - and `onSelect` reports one
 * question id with one `options[].value`, exactly as a single-question screen
 * does. Nothing here changes what is persisted.
 *
 * EXCLUSIVITY IS STRUCTURAL. Picking a word in one column disables that word's
 * cell in the other column, so the invalid state cannot be produced from the UI
 * at all. Changing the first pick re-enables the cell that pick had blocked. A
 * selection the participant made is never silently cleared - the conflicting cell
 * is blocked instead, which keeps the participant in control of which of the two
 * answers changes. This is the first of four enforcement points; draft save,
 * submit, and result import repeat the rule server side, because a client
 * control is a convenience and never a guarantee.
 *
 * A stored answer map that already carries the same word on both sides (legacy or
 * imported data) is rendered as it is: neither cell is disabled, a warning names
 * the word, and both of its radios point at that warning, so the contradiction is
 * visible and can be resolved from either column. Hiding or auto-correcting it
 * would leave a participant staring at a screen they cannot complete.
 *
 * Accessibility notes, since a radio grid is easy to get wrong:
 * - Real `<input type="radio">` elements, one radio group per column, named after
 *   the question they answer. Native inputs give arrow-key navigation within a
 *   column, skip the disabled cells, and expose "1 of 4" position for free.
 * - A real table: `<th scope="col">` for the three headings, `<th scope="row">`
 *   for each word, so a cell can be announced with both of its headers.
 * - Every radio has an accessible name carrying the word and the column.
 * - An sr-only `<caption>` names the group, so someone navigating by table is not
 *   dropped into an unnamed one.
 * - Each row header states that row's own state. A `disabled` radio cannot be
 *   focused, so arrow-key navigation skips a blocked cell in silence; without
 *   this, the excluded word would simply never be mentioned in that column.
 * - The visible rule line is referenced by `aria-describedby` from every radio in
 *   both columns, so the constraint is learned before a cell is disabled and
 *   explains the disabling afterwards.
 * - Selection is never signalled by colour alone: the native checked dot, an
 *   inset ring on the cell, and a heavier word in the Term column all move
 *   together.
 *
 * One consequence of native radios belongs to the caller: the arrow keys CHECK a
 * radio as they move focus onto it, so `onSelect` fires for words a keyboard user
 * is only passing through. Anything with a cost - advancing the screen - must not
 * be hung on `onSelect` alone. See `forced-choice-screen.ts`.
 */
export function ForcedChoiceGroupTable({
  group,
  mostValue,
  leastValue,
  disabled,
  conflictReportedElsewhere,
  onSelect,
}: ForcedChoiceGroupTableProps) {
  const uid = useId();
  const ruleId = `${uid}-rule`;
  const conflictId = `${uid}-conflict`;
  const blockedReasonId: Record<ForcedChoiceSide, string> = {
    most: `${uid}-most-blocked`,
    least: `${uid}-least-blocked`,
  };
  // The rule is not re-implemented here. `forcedChoiceGroupConflicts` is the same
  // predicate draft save, submit, and result import each evaluate, asked about
  // this one group, so the cell that reports a contradiction and the gate that
  // refuses to store it cannot disagree about what one is. It reports the option
  // VALUE; the label the participant reads comes from the group's own option list.
  const conflictValue = forcedChoiceGroupConflicts([group], {
    [group.mostQuestionId]: mostValue,
    [group.leastQuestionId]: leastValue,
  })[0]?.value;
  const conflictOption = conflictValue
    ? group.options.find((option) => option.value === conflictValue)
    : undefined;

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="sr-only">
        {`${group.label}: choose the word that is ${columnDescription("most")} and the word that is ${columnDescription("least")}.`}
      </legend>

      <div className="overflow-x-auto rounded-xl border border-slate-200/90">
        <table className="w-full border-collapse text-left">
          {/* The table needs its own accessible name: a screen-reader user who
              lists the page's tables, or who enters this one with table keys, is
              outside the fieldset and would otherwise be told only that there is
              a table. */}
          <caption className="sr-only">{group.label}</caption>
          <thead>
            <tr className="bg-slate-50/80 text-sm">
              <th
                scope="col"
                className="px-3 py-2.5 font-semibold text-slate-600"
              >
                Term
              </th>
              {(["most", "least"] as const).map((side) => (
                <th
                  key={side}
                  scope="col"
                  className="w-14 border-l border-slate-100 px-2 py-2.5 text-center font-semibold text-slate-600 sm:w-20"
                >
                  {columnHeading[side]}
                  <span className="sr-only">{` ${columnQualifier}`}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {group.options.map((option) => {
              const isMost = mostValue === option.value;
              const isLeast = leastValue === option.value;
              const conflicted = isMost && isLeast;
              const selected = isMost || isLeast;
              // A cell is blocked when the other column already holds this word.
              // The contradictory case - the same word on both sides, which only
              // stored data can produce - blocks neither cell, so the participant
              // can resolve it from either column.
              const mostBlocked = isLeast && !isMost;
              const leastBlocked = isMost && !isLeast;
              const stateNote = rowStateNote(isMost, isLeast);

              return (
                <tr
                  key={option.value}
                  className={selected ? "bg-blue-50/40" : undefined}
                >
                  <th
                    scope="row"
                    className={`px-3 py-2 text-base leading-6 break-words ${
                      selected
                        ? "font-semibold text-slate-950"
                        : "font-medium text-slate-800"
                    }`}
                  >
                    {option.label}
                    {stateNote ? (
                      <span className="sr-only">{` - ${stateNote}`}</span>
                    ) : null}
                  </th>
                  <ForcedChoiceCell
                    blocked={mostBlocked}
                    checked={isMost}
                    describedBy={describedByIds(
                      ruleId,
                      mostBlocked && blockedReasonId.most,
                      conflicted && conflictId,
                    )}
                    name={group.mostQuestionId}
                    onChoose={(value) => onSelect(group.mostQuestionId, value)}
                    option={option}
                    side="most"
                  />
                  <ForcedChoiceCell
                    blocked={leastBlocked}
                    checked={isLeast}
                    describedBy={describedByIds(
                      ruleId,
                      leastBlocked && blockedReasonId.least,
                      conflicted && conflictId,
                    )}
                    name={group.leastQuestionId}
                    onChoose={(value) => onSelect(group.leastQuestionId, value)}
                    option={option}
                    side="least"
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p
        id={ruleId}
        className="mt-3 flex items-start gap-2 text-sm leading-5 text-slate-600"
      >
        <Info
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-blue-500"
          size={15}
        />
        <span>{forcedChoiceExclusivityRule}</span>
      </p>

      {/* Hidden, but referenced by the disabled cells: a referenced element is
          still used to compute an accessible description, and keeping these out
          of the reading order means the reason is announced on the cell it
          belongs to instead of sitting on the page as loose text. */}
      <p hidden id={blockedReasonId.most}>
        {blockedReason("most")}
      </p>
      <p hidden id={blockedReasonId.least}>
        {blockedReason("least")}
      </p>

      {conflictOption ? (
        conflictReportedElsewhere ? (
          // The visible warning belongs to whoever is already showing one. This
          // stays as the description the two contradictory radios point at, so the
          // word is still named on the control that has to change.
          <p hidden id={conflictId}>
            {`${conflictOption.label} is recorded as both Most and Least. Choose a different word in one of the two columns to continue.`}
          </p>
        ) : (
          <p
            id={conflictId}
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 shrink-0"
              size={15}
            />
            <span>
              <strong className="font-semibold">{conflictOption.label}</strong>{" "}
              is recorded as both Most and Least. Choose a different word in one
              of the two columns to continue.
            </span>
          </p>
        )
      ) : null}
    </fieldset>
  );
}

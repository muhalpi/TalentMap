/**
 * Reconciling a stored draft with what the participant has already done in this
 * session, kept out of the runner component so each decision can be exercised
 * directly. Everything here is pure: no DOM, no state, no instrument import.
 *
 * WHY THIS EXISTS. `GET /api/test/draft` is fired on mount and the first screen
 * is interactive immediately, so a participant can answer - and, in grid mode,
 * answer both columns and be carried to the next group - before the response
 * arrives. Assigning the response straight into state replaced those answers, and
 * a lost answer is invisible to the participant: the radio they just pressed is
 * simply no longer checked, with no error and nothing to retry. Merging is
 * therefore the resolution rather than blocking the screen until the request
 * settles.
 */

type Answers = Record<string, string>;
type QuestionTimings = Record<string, number>;

/**
 * How the one-shot `GET /api/test/draft` on mount has turned out.
 *
 * Three states, not two. "failed" is not a variety of "loaded": the difference
 * between them is the whole of `canPersistDraft`.
 */
export type DraftLoadState = "pending" | "loaded" | "failed";

/**
 * Whether this session is allowed to write the stored draft.
 *
 * `PUT /api/test/draft` replaces the whole answer map, so a session that does not
 * know what the stored map holds must not write one. That is true before the read
 * returns, and it stays true when the read FAILS - a network blip, a 500, an
 * expired session. Treating a failure as "loaded" would mean the next selection
 * replaced a stored draft of twenty answers with the one answer given since,
 * turning a failed read into lost data.
 *
 * Nothing this session has done is dropped by refusing: the questionnaire cannot
 * be submitted until every question is answered, and submit sends the whole map
 * held in state. The runner tells the participant that autosave is off rather
 * than letting them assume it is on.
 */
export function canPersistDraft(state: DraftLoadState): boolean {
  return state === "loaded";
}

/**
 * The answer map to hold after a stored draft arrives.
 *
 * A locally chosen answer WINS over the stored one for the same question. It is
 * both the newer of the two and the one currently drawn on screen, so keeping the
 * stored value instead would silently contradict what the participant can see.
 * Every question the local session has not touched keeps its stored answer, which
 * is what makes this a resume rather than a reset.
 */
export function mergeDraftAnswers(loaded: Answers, local: Answers): Answers {
  return { ...loaded, ...local };
}

/**
 * The per-question timings to hold after a stored draft arrives.
 *
 * Summed rather than overwritten: a timing is the total seconds spent on that
 * question across every visit, and `recordTiming` in the runner already adds each
 * new stretch to the running total. A question answered both before this session
 * and again before the draft resolved has genuinely been worked on twice, so the
 * stored total and this session's stretch both belong in the figure. Taking one
 * side would either discard the earlier work or discard the current visit.
 */
export function mergeDraftTimings(
  loaded: QuestionTimings,
  local: QuestionTimings,
): QuestionTimings {
  const merged: QuestionTimings = { ...loaded };

  for (const [questionId, seconds] of Object.entries(local)) {
    merged[questionId] = (merged[questionId] ?? 0) + seconds;
  }

  return merged;
}

/**
 * Which screen to show once the stored resume position arrives.
 *
 * The stored position is only restored when the participant has not already acted.
 * Someone who answered the first screen, or navigated away from it, while the
 * request was in flight has told us where they want to be, and pulling them to the
 * position they left in an earlier session would move the page under their hands -
 * in grid mode, away from the group they were half way through answering.
 *
 * `storedScreenIndex` is expected to be clamped by the caller, which already owns
 * `clampScreenIndex` and the stored-index conversion.
 */
export function resumeScreenIndex({
  storedScreenIndex,
  localScreenIndex,
  hasLocalInteraction,
}: {
  storedScreenIndex: number;
  localScreenIndex: number;
  hasLocalInteraction: boolean;
}): number {
  return hasLocalInteraction ? localScreenIndex : storedScreenIndex;
}

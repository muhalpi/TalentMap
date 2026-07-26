import { DiscProfileReport } from "@/components/results/disc-profile-report";
import { ParticipantExperienceShell } from "@/components/test/participant-experience-shell";
import { ParticipantResultCompletion } from "@/components/test/participant-result-completion";
import type { DiscScoreOutput } from "@/tests/instruments/disc/types";

/**
 * The participant's DISC result screen.
 *
 * Everything a reader of a DISC result sees now comes from
 * `DiscProfileReport`, the one report body this screen shares with the
 * dashboard - the same arrangement BFI already uses. What stays here is only
 * what is genuinely the participant's: the assessment shell, the completion
 * banner with its elapsed time, and the focus target the runner moves to after
 * a submission.
 *
 * INSTRUMENT PURITY. This module is reachable from `participant-test-runner.tsx`,
 * a client entry, so every value import here is compiled into the participant's
 * bundle. `participant-client-graph.test.ts` walks that graph and fails on any
 * instrument module other than the score type guards, because the DISC item bank
 * is the answer key. Hence the type-only import below, and hence the fallback
 * `patternDetail` prop being null - see the prop's note.
 */
export function DiscParticipantResult({
  durationSeconds,
  organizationName,
  score,
  testName,
}: {
  durationSeconds: number;
  organizationName: string;
  score: DiscScoreOutput;
  testName: string;
}) {
  return (
    <ParticipantExperienceShell
      organizationName={organizationName}
      testName={testName}
      status="completed"
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <ParticipantResultCompletion
          description="Your DISC profile is ready to explore below."
          durationSeconds={durationSeconds}
        />

        <DiscProfileReport
          badgeLabel="Your DISC behavioral profile"
          focusHeading
          headingId="disc-result-heading"
          /*
           * Null, and that is now the complete answer rather than a shortfall.
           *
           * Emotions, Goal, Judges others by and the six alongside them are
           * authored per pattern in the instrument's `profiles.ts`, and
           * `scoreDiscAnswers` copies the set for the derived pattern onto
           * `score.result.patternDetail`. The report reads them from there, so
           * this screen shows the same twelve report rows the dashboard shows
           * while still importing the instrument for types only. This prop is
           * only the fallback for a record stored before that field existed,
           * and this surface genuinely cannot resolve one: looking it up would
           * mean a value import of `profiles.ts`, which would ship the adjective
           * keying - the answer key - to the browser.
           */
          patternDetail={null}
          score={score}
        />
      </section>
    </ParticipantExperienceShell>
  );
}

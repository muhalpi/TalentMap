import { BfiProfileReport } from "@/components/results/bfi-profile-report";
import { ParticipantExperienceShell } from "@/components/test/participant-experience-shell";
import { ParticipantResultCompletion } from "@/components/test/participant-result-completion";
import type { BfiScoreOutput } from "@/tests/instruments/bfi/types";

export function BfiParticipantResult({
  durationSeconds,
  organizationName,
  score,
  testName,
}: {
  durationSeconds: number;
  organizationName: string;
  score: BfiScoreOutput;
  testName: string;
}) {
  return (
    <ParticipantExperienceShell
      organizationName={organizationName}
      testName={testName}
      status="completed"
    >
      <section className="mx-auto max-w-6xl space-y-6">
        <ParticipantResultCompletion
          description="Your Big Five profile is ready to explore below."
          durationSeconds={durationSeconds}
        />
        <BfiProfileReport score={score} />
      </section>
    </ParticipantExperienceShell>
  );
}

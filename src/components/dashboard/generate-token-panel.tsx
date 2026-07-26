"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Clipboard, Loader2, Plus } from "lucide-react";

export interface TokenParticipantOption {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  externalReference: string | null;
  liveTestKeys: string[];
}

interface GeneratedAccess {
  accessUrl: string;
  accessCode: string;
  expiresAt: string;
  testKey: string;
}

export interface TokenAssessmentOption {
  testKey: string;
  testName: string;
  version: string;
  quotaAvailable: number;
}

function participantLabel(participant: TokenParticipantOption) {
  const detail =
    participant.email ?? participant.employeeId ?? participant.externalReference;

  return detail ? `${participant.name} - ${detail}` : participant.name;
}

export function GenerateTokenPanel({
  assessments,
  participants,
}: {
  assessments: TokenAssessmentOption[];
  participants: TokenParticipantOption[];
}) {
  const router = useRouter();
  const [testKey, setTestKey] = useState(
    assessments.find((assessment) => assessment.quotaAvailable > 0)?.testKey ??
      assessments[0]?.testKey ??
      "",
  );
  const [participantId, setParticipantId] = useState("");
  const [generated, setGenerated] = useState<GeneratedAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedAssessment = assessments.find(
    (assessment) => assessment.testKey === testKey,
  );
  const generatedAssessment = assessments.find(
    (assessment) => assessment.testKey === generated?.testKey,
  );
  const selectedParticipant = participants.find(
    (participant) => participant.id === participantId,
  );
  const participantAlreadyHasAssessment = Boolean(
    selectedParticipant?.liveTestKeys.includes(testKey),
  );
  const canGenerate = Boolean(
    selectedAssessment &&
      selectedAssessment.quotaAvailable > 0 &&
      participantId &&
      !participantAlreadyHasAssessment,
  );

  function generateAccess() {
    startTransition(async () => {
      setError(null);
      setCopied(false);

      const response = await fetch("/api/dashboard/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testKey,
          participantId,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Unable to create assessment access.");
        return;
      }

      setGenerated(body);
      setParticipantId("");
      router.refresh();
    });
  }

  async function copyInvitation() {
    if (!generated) {
      return;
    }

    await navigator.clipboard.writeText(
      `Assessment: ${generated.accessUrl}\nAccess code: ${generated.accessCode}`,
    );
    setCopied(true);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Create assessment access</h2>
          <p className="mt-1 text-sm leading-6 text-foreground/65">
            Assign one live assessment of each type to a participant.
          </p>
        </div>
        <Plus className="text-accent" size={20} />
      </div>

      <label className="mt-4 block text-sm font-medium" htmlFor="assessment">
        Assessment
      </label>
      <select
        id="assessment"
        value={testKey}
        onChange={(event) => {
          const nextTestKey = event.target.value;
          setTestKey(nextTestKey);

          if (selectedParticipant?.liveTestKeys.includes(nextTestKey)) {
            setParticipantId("");
          }

          setGenerated(null);
          setError(null);
        }}
        aria-describedby="assessment-help"
        className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {assessments.length ? null : (
          <option value="">No assessment available</option>
        )}
        {assessments.map((assessment) => (
          <option
            key={`${assessment.testKey}-${assessment.version}`}
            value={assessment.testKey}
            disabled={assessment.quotaAvailable < 1}
          >
            {assessment.testName} — {assessment.quotaAvailable} available
          </option>
        ))}
      </select>
      <p id="assessment-help" className="mt-2 text-sm leading-5 text-foreground/65">
        {selectedAssessment
          ? `${selectedAssessment.version} · ${selectedAssessment.quotaAvailable} assignments available`
          : "Ask an administrator to enable an assessment and allocate quota."}
      </p>

      <label className="mt-4 block text-sm font-medium" htmlFor="participant">
        Participant
      </label>
      <select
        id="participant"
        value={participantId}
        onChange={(event) => setParticipantId(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <option value="">Select participant</option>
        {participants.map((participant) => (
          <option
            key={participant.id}
            value={participant.id}
            disabled={participant.liveTestKeys.includes(testKey)}
          >
            {participantLabel(participant)}
            {participant.liveTestKeys.includes(testKey)
              ? ` — ${testKey.toUpperCase()} already live`
              : ""}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs leading-5 text-foreground/55">
        {participantAlreadyHasAssessment
          ? `This participant already has a live ${testKey.toUpperCase()} assessment.`
          : "Completed and expired assignments do not block a new assessment of the same type."}
      </p>

      <button
        type="button"
        onClick={generateAccess}
        disabled={isPending || !canGenerate}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <Plus size={16} />
        )}
        Create access code
      </button>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/35 bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {generated ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-lg border border-border bg-background p-3"
        >
          <p className="text-sm font-medium text-foreground/70">
            {generatedAssessment?.testName ?? generated.testKey.toUpperCase()} access created
          </p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                Shared assessment URL
              </p>
              <a
                href={generated.accessUrl}
                className="mt-1 block break-all font-mono text-sm text-accent hover:text-accent-strong"
              >
                {generated.accessUrl}
              </a>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                Participant access code
              </p>
              <p className="mt-1 break-all font-mono text-base font-semibold tracking-wide text-foreground">
                {generated.accessCode}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-foreground/60">
              Expires {new Date(generated.expiresAt).toLocaleString()}
            </p>
            <button
              type="button"
              onClick={copyInvitation}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium hover:border-accent hover:text-accent"
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? "Copied" : "Copy invitation"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

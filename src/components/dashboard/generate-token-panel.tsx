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
}

interface GeneratedToken {
  participantUrl: string;
  token: string;
  expiresAt: string;
}

function participantLabel(participant: TokenParticipantOption) {
  const detail =
    participant.email ?? participant.employeeId ?? participant.externalReference;

  return detail ? `${participant.name} - ${detail}` : participant.name;
}

export function GenerateTokenPanel({
  participants,
}: {
  participants: TokenParticipantOption[];
}) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState("");
  const [participantReference, setParticipantReference] = useState("");
  const [generated, setGenerated] = useState<GeneratedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generateToken() {
    startTransition(async () => {
      setError(null);
      setCopied(false);

      const fallbackReference = participantReference.trim();
      const response = await fetch("/api/dashboard/demo/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testKey: "mbti",
          participantId: participantId || undefined,
          participantReference: participantId
            ? undefined
            : fallbackReference || undefined,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "Unable to generate token.");
        return;
      }

      setGenerated(body);
      setParticipantId("");
      setParticipantReference("");
      router.refresh();
    });
  }

  async function copyUrl() {
    if (!generated) {
      return;
    }

    await navigator.clipboard.writeText(generated.participantUrl);
    setCopied(true);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Generate Token</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Issues a real single-use MBTI link for the seeded tenant.
          </p>
        </div>
        <Plus className="text-accent" size={20} />
      </div>

      <label className="mt-4 block text-sm font-medium" htmlFor="participant">
        Participant
      </label>
      <select
        id="participant"
        value={participantId}
        onChange={(event) => setParticipantId(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
      >
        <option value="">Select participant</option>
        {participants.map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participantLabel(participant)}
          </option>
        ))}
      </select>

      <label
        className="mt-4 block text-sm font-medium"
        htmlFor="participant-reference"
      >
        Legacy reference
      </label>
      <input
        id="participant-reference"
        value={participantReference}
        onChange={(event) => setParticipantReference(event.target.value)}
        placeholder="TM-0042 or employee ID"
        disabled={Boolean(participantId)}
        className="mt-2 h-10 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/45"
      />

      <button
        type="button"
        onClick={generateToken}
        disabled={isPending || (!participantId && !participantReference.trim())}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <Plus size={16} />
        )}
        Generate MBTI Token
      </button>

      {error ? (
        <p className="mt-4 rounded-lg border border-danger/35 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {generated ? (
        <div className="mt-4 rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
            Participant URL
          </p>
          <a
            href={generated.participantUrl}
            className="mt-2 block break-all font-mono text-sm text-accent hover:text-accent-strong"
          >
            {generated.participantUrl}
          </a>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="font-mono text-xs text-foreground/60">
              Expires {new Date(generated.expiresAt).toLocaleString()}
            </p>
            <button
              type="button"
              onClick={copyUrl}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium hover:border-accent hover:text-accent"
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

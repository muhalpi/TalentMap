"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface ParticipantConsentGateProps {
  token: string;
  organizationName: string;
  participantName: string;
  test: {
    name: string;
    version: string;
    estimatedMinutes: number;
  };
  contractEndsAt: string;
  retentionGraceDays: number;
  consentVersion: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ParticipantConsentGate({
  token,
  organizationName,
  participantName,
  test,
  contractEndsAt,
  retentionGraceDays,
  consentVersion,
}: ParticipantConsentGateProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const noticeRows = [
    {
      label: "Data collected",
      value:
        "Assessment answers, generated score, result interpretation, token activity, timestamp, browser user agent, and hashed IP address when available.",
    },
    {
      label: "Purpose",
      value:
        "Administer this assessment, generate talent/personality insights, and provide results to the organization that issued this link.",
    },
    {
      label: "Retention",
      value: `Assessment results are retained through ${formatDate(contractEndsAt)}. After that, they enter a ${retentionGraceDays} day grace period before anonymization unless the contract is renewed.`,
    },
    {
      label: "Access",
      value: `Authorized users at ${organizationName} can access participant assessment records.`,
    },
    {
      label: "Rights and deletion contact",
      value: `Contact ${organizationName}'s assessment administrator to request access, correction, deletion, or other privacy rights support.`,
    },
  ];

  function agreeAndStart() {
    if (!accepted || isPending) {
      return;
    }

    startTransition(async () => {
      setError(null);

      try {
        const consentResponse = await fetch(
          `/api/test/${encodeURIComponent(token)}/consent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ accepted: true }),
          },
        );
        const consentBody = await consentResponse.json();

        if (!consentResponse.ok) {
          throw new Error(
            consentBody.error ?? "Unable to record participant consent.",
          );
        }

        const startResponse = await fetch(
          `/api/test/${encodeURIComponent(token)}/start`,
          { method: "POST" },
        );
        const startBody = await startResponse.json();

        if (!startResponse.ok) {
          throw new Error(startBody.error ?? "Unable to start assessment.");
        }

        router.refresh();
      } catch (agreeError) {
        setError(
          agreeError instanceof Error
            ? agreeError.message
            : "Unable to start assessment.",
        );
      }
    });
  }

  if (declined) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-5 py-6 text-foreground">
        <section className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <XCircle className="text-warning" size={26} />
          <h1 className="mt-5 text-2xl font-semibold tracking-normal">
            Consent declined
          </h1>
          <p className="mt-3 text-sm leading-6 text-foreground/65">
            The assessment has not been started. Contact {organizationName} if
            you have questions about this assessment or your privacy rights.
          </p>
          <button
            type="button"
            onClick={() => setDeclined(false)}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:border-accent hover:text-accent"
          >
            <ClipboardCheck size={16} />
            Review Consent
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground lg:px-8">
      <section className="mx-auto grid max-w-5xl gap-6 rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] lg:grid-cols-[1fr_300px] lg:p-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-accent">
            <ShieldCheck size={16} />
            Consent Required
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            {test.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/65">
            Before you begin, review how {organizationName} will use and retain
            your assessment data.
          </p>

          <div className="mt-6 divide-y divide-border border-y border-border">
            {noticeRows.map((row) => (
              <div key={row.label} className="grid gap-2 py-4 md:grid-cols-[190px_1fr]">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-sm leading-6 text-foreground/65">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          <label className="mt-6 grid cursor-pointer grid-cols-[22px_1fr] gap-3 rounded-lg border border-border bg-background p-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[var(--accent)]"
            />
            <span className="text-sm leading-6">
              I have read this notice and agree to start the assessment.
            </span>
          </label>

          {error ? (
            <p className="mt-4 rounded-lg border border-danger/35 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={agreeAndStart}
              disabled={!accepted || isPending}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Agree and Start
            </button>
            <button
              type="button"
              onClick={() => setDeclined(true)}
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground/75 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
            >
              Decline
            </button>
          </div>
        </div>

        <aside className="border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="font-mono text-xs uppercase tracking-wide text-foreground/55">
            Assessment
          </p>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-foreground/55">Organization</dt>
              <dd className="mt-1 font-medium">{organizationName}</dd>
            </div>
            <div>
              <dt className="text-foreground/55">Participant</dt>
              <dd className="mt-1 font-medium">{participantName}</dd>
            </div>
            <div>
              <dt className="text-foreground/55">Version</dt>
              <dd className="mt-1 font-mono">{test.version}</dd>
            </div>
            <div>
              <dt className="text-foreground/55">Estimated time</dt>
              <dd className="mt-1 font-mono">{test.estimatedMinutes} min</dd>
            </div>
            <div>
              <dt className="text-foreground/55">Consent version</dt>
              <dd className="mt-1 font-mono text-xs">{consentVersion}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}

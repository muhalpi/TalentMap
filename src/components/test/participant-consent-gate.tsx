"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileQuestion,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Target,
  UserRound,
  UserRoundCheck,
  UsersRound,
  XCircle,
} from "lucide-react";

import { ParticipantExperienceShell } from "@/components/test/participant-experience-shell";

interface ParticipantConsentGateProps {
  organizationName: string;
  participantName: string;
  test: {
    name: string;
    description: string;
    estimatedMinutes: number;
    questionCount: number;
  };
  contractEndsAt: string;
  retentionGraceDays: number;
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
  organizationName,
  participantName,
  test,
  contractEndsAt,
  retentionGraceDays,
}: ParticipantConsentGateProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const noticeRows = [
    {
      label: "Data collected",
      icon: Database,
      value:
        "Assessment answers, generated score, result interpretation, access activity, timestamp, browser user agent, and hashed IP address when available.",
    },
    {
      label: "Purpose",
      icon: Target,
      value:
        "Administer this assessment, generate talent and personality insights, and provide results to the organization that issued this link.",
    },
    {
      label: "Retention",
      icon: CalendarClock,
      value: `Assessment results are retained through ${formatDate(contractEndsAt)}. They then enter a ${retentionGraceDays} day grace period before anonymization unless the contract is renewed.`,
    },
    {
      label: "Access",
      icon: UsersRound,
      value: `Authorized users at ${organizationName} can access participant assessment records.`,
    },
    {
      label: "Rights and deletion contact",
      icon: UserRoundCheck,
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
        const consentResponse = await fetch("/api/test/consent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ accepted: true }),
        });
        const consentBody = await consentResponse.json();

        if (!consentResponse.ok) {
          throw new Error(
            consentBody.error ?? "Unable to record participant consent.",
          );
        }

        const startResponse = await fetch("/api/test/start", {
          method: "POST",
        });
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
      <ParticipantExperienceShell
        organizationName={organizationName}
        testName={test.name}
        status="consent"
      >
        <section className="mx-auto grid min-h-[calc(100vh-8.5rem)] max-w-md place-items-center">
          <div className="w-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <span
              aria-hidden="true"
              className="mx-auto grid size-10 place-items-center rounded-full bg-orange-50 text-orange-700"
            >
              <XCircle size={20} />
            </span>
            <h1 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-slate-950">
              Consent declined
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
              The assessment has not been started. Contact {organizationName} if
              you have questions about this assessment or your privacy rights.
            </p>
            <button
              type="button"
              onClick={() => setDeclined(false)}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-blue-500 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Review consent
            </button>
          </div>
        </section>
      </ParticipantExperienceShell>
    );
  }

  return (
    <ParticipantExperienceShell
      organizationName={organizationName}
      testName={test.name}
      status="consent"
      metaLabel={`${test.estimatedMinutes} min`}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <section
          aria-labelledby="assessment-overview-title"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgb(15_23_42/0.07)]"
        >
          <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7 sm:py-8">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-24 size-64 rounded-full border-[38px] border-blue-500/15"
            />
            <div
              aria-hidden="true"
              className="absolute bottom-0 right-20 h-px w-32 bg-gradient-to-r from-transparent via-blue-400/70 to-transparent"
            />
            <div className="relative">
              <div className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/15 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
                <ClipboardCheck aria-hidden="true" size={15} />
                Your assessment
              </div>
              <h1
                id="assessment-overview-title"
                className="mt-4 max-w-2xl break-words text-2xl font-semibold leading-tight tracking-[-0.035em] text-white sm:text-3xl"
              >
                {test.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                {test.description}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-4">
            {[
              {
                label: "Organization",
                value: organizationName,
                icon: Building2,
              },
              {
                label: "Participant",
                value: participantName,
                icon: UserRound,
              },
              {
                label: "Questions",
                value: String(test.questionCount),
                icon: FileQuestion,
              },
              {
                label: "Est. time",
                value: `${test.estimatedMinutes} min`,
                icon: CalendarClock,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="min-w-0 bg-white p-4 sm:p-5">
                  <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <Icon
                      aria-hidden="true"
                      className="text-blue-600"
                      size={15}
                    />
                    {item.label}
                  </dt>
                  <dd className="mt-2 break-words text-sm font-semibold leading-5 text-slate-950 sm:text-base">
                    {item.value}
                  </dd>
                </div>
              );
            })}
          </dl>

          <p className="m-4 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-6 text-slate-700 sm:mx-5 sm:mb-5">
            {`You'll answer ${test.questionCount} questions in about ${test.estimatedMinutes} minutes. There are no right or wrong answers—choose the option that best reflects you.`}
          </p>
        </section>

        <section
          aria-labelledby="privacy-consent-title"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-blue-700">
            <LockKeyhole aria-hidden="true" size={15} />
            Consent required
          </div>
          <h2
            id="privacy-consent-title"
            className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-950"
          >
            Privacy and consent
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Before you begin, review how {organizationName} will collect, use,
            retain, and protect your assessment data.
          </p>

          <dl className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
            {noticeRows.map((row) => {
              const Icon = row.icon;

              return (
                <div key={row.label} className="flex gap-3 py-3">
                  <Icon
                    aria-hidden="true"
                    size={16}
                    strokeWidth={2}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />
                  <div className="min-w-0">
                    <dt className="text-sm font-semibold text-slate-900">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 text-sm leading-6 text-slate-600">
                      {row.value}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>

          <label className="mt-4 flex min-h-10 cursor-pointer items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600">
            <input
              type="checkbox"
              checked={accepted}
              aria-describedby="consent-explanation"
              onChange={(event) => {
                setAccepted(event.target.checked);
                setError(null);
              }}
              className="mt-0.5 size-4 shrink-0 cursor-pointer accent-blue-600"
            />
            <span className="text-sm leading-6 text-slate-800">
              <span className="font-medium">
                I have read this notice and agree to start the assessment.
              </span>
              <span
                id="consent-explanation"
                className="mt-0.5 block text-xs leading-5 text-slate-600"
              >
                Agreeing records your consent. You can decline without starting.
              </span>
            </span>
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm leading-6 text-red-800"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={agreeAndStart}
              disabled={!accepted || isPending}
              aria-busy={isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
            >
              {isPending ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={16}
                />
              ) : (
                <CheckCircle2 aria-hidden="true" size={16} />
              )}
              Agree and start
              {!isPending ? <ArrowRight aria-hidden="true" size={15} /> : null}
            </button>
            <button
              type="button"
              onClick={() => setDeclined(true)}
              disabled={isPending}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-500 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Decline
            </button>
          </div>

          <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-600">
            <ShieldCheck
              aria-hidden="true"
              className="shrink-0 text-emerald-600"
              size={15}
            />
            Your responses are secured and used only as described in this
            notice.
          </p>
        </section>
      </div>
    </ParticipantExperienceShell>
  );
}

import { headers } from "next/headers";
import { LockKeyhole, Sparkles } from "lucide-react";

import {
  getParticipantSession,
  participantAccessRateLimitKey,
} from "@/auth/participant-session";
import { ParticipantAccessForm } from "@/components/test/participant-access-form";
import { ParticipantAccessResetButton } from "@/components/test/participant-access-reset-button";
import { ParticipantConsentGate } from "@/components/test/participant-consent-gate";
import { ParticipantTestRunner } from "@/components/test/participant-test-runner";
import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";
import { getParticipantTestContext } from "@/services/participant-service";
import {
  enforceTestTokenRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function AccessUnavailableCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f7f9fc] px-5 text-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_-10%,rgba(37,99,235,0.12),transparent_62%)]"
      />
      <section className="relative w-full max-w-lg rounded-xl border border-slate-200/90 bg-white p-6 text-center shadow-[0_12px_40px_rgb(15_23_42/0.07)] sm:p-8">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-blue-600 text-white shadow-[0_6px_16px_rgb(37_99_235/0.24)]">
          <Sparkles aria-hidden="true" size={19} />
        </span>
        <span className="mx-auto mt-6 grid size-10 place-items-center rounded-full bg-red-50 text-red-600">
          <LockKeyhole aria-hidden="true" size={19} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
        <ParticipantAccessResetButton />
      </section>
    </main>
  );
}

function entryError(value: string | string[] | undefined) {
  const error = Array.isArray(value) ? value[0] : value;

  if (error === "rate_limited") {
    return "Too many access attempts. Wait a few minutes and try again.";
  }

  if (error === "invalid") {
    return "That access code is invalid or unavailable.";
  }

  return null;
}

export default async function ParticipantTestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await getParticipantSession();

  if (!access) {
    const query = await searchParams;
    return <ParticipantAccessForm initialError={entryError(query.error)} />;
  }

  try {
    await enforceTestTokenRateLimit({
      rawToken: participantAccessRateLimitKey(access),
      headers: await headers(),
      scope: "test_page",
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return (
        <AccessUnavailableCard
          title="Too many attempts"
          body={`Assessment access is temporarily limited. Try again after ${error.resetAt.toLocaleString()}.`}
        />
      );
    }

    throw error;
  }

  const context = await getParticipantTestContext(access);

  if (!context) {
    return (
      <ParticipantAccessForm initialError="Your access session is no longer valid. Enter the latest code supplied by your organization." />
    );
  }

  if (
    context.token.status !== "active" &&
    context.token.status !== "in_progress"
  ) {
    return (
      <AccessUnavailableCard
        title={
          context.token.status === "completed"
            ? "Assessment completed"
            : "Assessment access expired"
        }
        body={
          context.token.status === "completed"
            ? "This assessment has already been submitted. Use another access code only if your organization assigned you a different assessment."
            : "This access code can no longer be used. Ask your organization’s assessment administrator for a replacement if another attempt is required."
        }
      />
    );
  }

  if (!context.demo && !context.participant) {
    return (
      <AccessUnavailableCard
        title="Participant profile required"
        body="This assessment access is not linked to a participant profile. Ask your organization’s assessment administrator to replace it."
      />
    );
  }

  if (
    !context.demo &&
    context.participant &&
    (context.participant.status !== "active" || context.participant.deletedAt)
  ) {
    return (
      <AccessUnavailableCard
        title="Participant profile inactive"
        body="This participant profile is no longer active. Contact your organization’s assessment administrator for support."
      />
    );
  }

  if (!context.demo && !context.consent.acceptedAt && context.participant) {
    return (
      <ParticipantConsentGate
        organizationName={context.client.name}
        participantName={context.participant.name}
        contractEndsAt={context.client.contractEndsAt.toISOString()}
        retentionGraceDays={RETENTION_DELETE_GRACE_DAYS}
        test={{
          name: context.test.name,
          description: context.definition.description,
          estimatedMinutes: context.definition.estimatedMinutes,
          questionCount: context.definition.questions.length,
        }}
      />
    );
  }

  return (
    <ParticipantTestRunner
      organizationName={context.client.name}
      initialStatus={context.token.status}
      initialStartedAt={context.token.startedAt?.toISOString() ?? null}
      test={{
        key: context.definition.key,
        name: context.test.name,
        version: context.test.version,
        questions: context.definition.questions,
      }}
    />
  );
}

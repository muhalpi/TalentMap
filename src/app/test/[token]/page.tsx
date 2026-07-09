import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";

import { ParticipantConsentGate } from "@/components/test/participant-consent-gate";
import { ParticipantTestRunner } from "@/components/test/participant-test-runner";
import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";
import {
  getParticipantTestContext,
  PARTICIPANT_CONSENT_VERSION,
} from "@/services/participant-service";
import {
  enforceInvalidTokenRateLimit,
  enforceTestTokenRateLimit,
  RateLimitExceededError,
} from "@/services/test-rate-limit-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function TokenUnavailableCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <section className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
        <LockKeyhole className="text-danger" size={24} />
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-foreground/65">{body}</p>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong"
        >
          <ArrowLeft size={16} />
          Console
        </Link>
      </section>
    </main>
  );
}

function RateLimitCard({ error }: { error: RateLimitExceededError }) {
  return (
    <TokenUnavailableCard
      title="Too many attempts"
      body={`This assessment link is temporarily rate limited. Try again after ${error.resetAt.toLocaleString()}.`}
    />
  );
}

export default async function ParticipantTestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const requestHeaders = await headers();

  try {
    await enforceTestTokenRateLimit({
      rawToken: token,
      headers: requestHeaders,
      scope: "test_page",
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return <RateLimitCard error={error} />;
    }

    throw error;
  }

  const context = await getParticipantTestContext(token);

  if (!context) {
    try {
      await enforceInvalidTokenRateLimit({
        rawToken: token,
        headers: requestHeaders,
      });
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        return <RateLimitCard error={error} />;
      }

      throw error;
    }

    notFound();
  }

  if (
    context.token.status !== "active" &&
    context.token.status !== "in_progress"
  ) {
    return (
      <TokenUnavailableCard
        title={`Token ${context.token.status}`}
        body="This participant link can no longer be used. Ask the client administrator to issue a new token if another attempt is required."
      />
    );
  }

  if (!context.demo && !context.participant) {
    return (
      <TokenUnavailableCard
        title="Participant profile required"
        body="This assessment link is not linked to a participant profile. Ask the client administrator to issue a new participant-based token."
      />
    );
  }

  if (
    !context.demo &&
    context.participant &&
    (context.participant.status !== "active" || context.participant.deletedAt)
  ) {
    return (
      <TokenUnavailableCard
        title="Participant profile inactive"
        body="This assessment link is linked to a participant profile that is no longer active. Ask the client administrator to issue a new token if another attempt is required."
      />
    );
  }

  if (!context.demo && !context.consent.acceptedAt && context.participant) {
    return (
      <ParticipantConsentGate
        token={token}
        organizationName={context.client.name}
        participantName={context.participant.name}
        contractEndsAt={context.client.contractEndsAt.toISOString()}
        retentionGraceDays={RETENTION_DELETE_GRACE_DAYS}
        consentVersion={PARTICIPANT_CONSENT_VERSION}
        test={{
          name: context.test.name,
          version: context.test.version,
          estimatedMinutes: context.definition.estimatedMinutes,
        }}
      />
    );
  }

  return (
    <ParticipantTestRunner
      token={token}
      organizationName={context.client.name}
      initialStatus={context.token.status}
      test={{
        key: context.definition.key,
        name: context.test.name,
        version: context.test.version,
        estimatedMinutes: context.definition.estimatedMinutes,
        questions: context.definition.questions,
      }}
    />
  );
}

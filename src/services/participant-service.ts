import { and, eq, inArray, sql } from "drizzle-orm";

import type { ParticipantSessionAccess } from "@/auth/participant-session";
import { getDb } from "@/db/client";
import {
  clients,
  participantAnswerDrafts,
  participantConsents,
  participants,
  participantTokens,
  results,
  tests,
} from "@/db/schema";
import { retentionUntilContractEnd } from "@/db/tenant";
import { participantCredentialHashes } from "@/lib/crypto";
import {
  getDemoTestKey,
  type DemoTestKey,
} from "@/lib/demo-test-token";
import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";
import { getTestDefinition } from "@/tests/registry";
import {
  forcedChoiceConflictGroupList,
  forcedChoiceGroupConflicts,
  type ForcedChoiceGroupConflict,
} from "@/tests/shared/forced-choice";
import type { AnswerMap, ScoreOutput, TestDefinition } from "@/tests/shared/types";

type TokenStatus = "active" | "in_progress" | "completed" | "expired";
type ParticipantStatus = "active" | "archived" | "anonymized";
export type ParticipantAccessCredential = string | ParticipantSessionAccess;

export const PARTICIPANT_CONSENT_VERSION = "talentmap-consent-v1";

export interface ParticipantTestContext {
  token: {
    id: string;
    status: TokenStatus;
    expiresAt: Date;
    startedAt: Date | null;
    accessVersion: number;
  };
  participant: {
    id: string;
    name: string;
    status: ParticipantStatus;
    deletedAt: Date | null;
  } | null;
  consent: {
    acceptedAt: Date | null;
    version: string | null;
  };
  client: {
    clientId: string;
    name: string;
    contractEndsAt: Date;
  };
  test: {
    id: string;
    key: string;
    name: string;
    version: string;
  };
  definition: TestDefinition;
  demo: boolean;
}

export interface SubmitParticipantResult {
  score: ScoreOutput;
  persisted: boolean;
  durationSeconds: number;
}

export interface AcceptParticipantConsentInput {
  ipHash?: string | null;
  userAgent?: string | null;
}

export interface AcceptedParticipantConsent {
  acceptedAt: Date;
  consentVersion: string;
}

export interface ParticipantAnswerDraftDto {
  answers: AnswerMap;
  questionTimings: Record<string, number>;
  currentQuestionIndex: number;
  updatedAt: Date;
}

function demoContext(testKey: DemoTestKey): ParticipantTestContext {
  const definition = getTestDefinition(testKey);

  if (!definition) {
    throw new Error(`Demo ${testKey} definition is not registered.`);
  }

  return {
    token: {
      id: "demo-token",
      status: "active",
      expiresAt: new Date("2099-12-31T23:59:59.000Z"),
      startedAt: null,
      accessVersion: 1,
    },
    participant: null,
    consent: {
      acceptedAt: null,
      version: null,
    },
    client: {
      clientId: "demo-client",
      name: "Demo Organization",
      contractEndsAt: new Date("2099-12-31T23:59:59.000Z"),
    },
    test: {
      id: "demo-test",
      key: definition.key,
      name: definition.name,
      version: definition.version,
    },
    definition,
    demo: true,
  };
}

function getEffectiveStatus(row: {
  tokenStatus: TokenStatus;
  expiresAt: Date;
  contractEndsAt: Date;
  clientStatus: "active" | "suspended" | "expired";
}): TokenStatus {
  if (row.tokenStatus === "completed") {
    return "completed";
  }

  const now = Date.now();

  if (
    row.tokenStatus === "expired" ||
    row.clientStatus !== "active" ||
    row.expiresAt.getTime() <= now ||
    row.contractEndsAt.getTime() <= now
  ) {
    return "expired";
  }

  return row.tokenStatus;
}

export async function getParticipantTestContext(
  access: ParticipantAccessCredential,
) {
  const demoKey =
    typeof access === "string"
      ? getDemoTestKey(access)
      : access.kind === "demo"
        ? access.demoKey
        : null;

  if (demoKey) {
    return demoContext(demoKey);
  }

  const credentialCondition =
    typeof access === "string"
      ? inArray(
          participantTokens.tokenHash,
          participantCredentialHashes(access),
        )
      : access.kind === "assignment"
        ? and(
            eq(participantTokens.id, access.assignmentId),
            eq(participantTokens.accessVersion, access.accessVersion),
          )
        : sql`false`;

  const db = getDb();
  const [row] = await db
    .select({
      tokenId: participantTokens.id,
      clientId: participantTokens.clientId,
      tokenStatus: participantTokens.status,
      expiresAt: participantTokens.expiresAt,
      startedAt: participantTokens.startedAt,
      accessVersion: participantTokens.accessVersion,
      testId: participantTokens.testId,
      testKey: tests.testKey,
      testName: tests.displayName,
      testVersion: tests.version,
      testEnabled: tests.isEnabled,
      participantId: participantTokens.participantId,
      participantName: participants.name,
      participantStatus: participants.status,
      participantDeletedAt: participants.deletedAt,
      consentAcceptedAt: participantConsents.acceptedAt,
      consentVersion: participantConsents.consentVersion,
      clientName: clients.name,
      clientStatus: clients.status,
      contractEndsAt: clients.contractEndsAt,
    })
    .from(participantTokens)
    .innerJoin(
      tests,
      and(
        eq(participantTokens.testId, tests.id),
        eq(participantTokens.clientId, tests.clientId),
      ),
    )
    .innerJoin(clients, eq(participantTokens.clientId, clients.clientId))
    .leftJoin(
      participants,
      and(
        eq(participants.id, participantTokens.participantId),
        eq(participants.clientId, participantTokens.clientId),
      ),
    )
    .leftJoin(
      participantConsents,
      and(
        eq(participantConsents.tokenId, participantTokens.id),
        eq(participantConsents.clientId, participantTokens.clientId),
      ),
    )
    .where(credentialCondition)
    .limit(1);

  if (!row || !row.testEnabled) {
    return null;
  }

  const definition = getTestDefinition(row.testKey);

  if (!definition || !definition.implemented) {
    return null;
  }

  return {
    token: {
      id: row.tokenId,
      status: getEffectiveStatus(row),
      expiresAt: row.expiresAt,
      startedAt: row.startedAt,
      accessVersion: row.accessVersion,
    },
    participant:
      row.participantId && row.participantName && row.participantStatus
        ? {
            id: row.participantId,
            name: row.participantName,
            status: row.participantStatus,
            deletedAt: row.participantDeletedAt,
          }
        : null,
    consent: {
      acceptedAt: row.consentAcceptedAt,
      version: row.consentVersion,
    },
    client: {
      clientId: row.clientId,
      name: row.clientName,
      contractEndsAt: row.contractEndsAt,
    },
    test: {
      id: row.testId,
      key: row.testKey,
      name: row.testName,
      version: row.testVersion,
    },
    definition,
    demo: false,
  } satisfies ParticipantTestContext;
}

function assertUsableParticipant(
  context: ParticipantTestContext,
): asserts context is ParticipantTestContext & {
  participant: NonNullable<ParticipantTestContext["participant"]>;
} {
  if (!context.participant) {
    throw new Error("This assessment access is not linked to a participant profile.");
  }

  if (
    context.participant.status !== "active" ||
    context.participant.deletedAt
  ) {
    throw new Error("This participant profile is not active.");
  }
}

function assertDraftableContext(
  context: ParticipantTestContext,
): asserts context is ParticipantTestContext & {
  participant: NonNullable<ParticipantTestContext["participant"]>;
} {
  if (context.token.status === "expired") {
    throw new Error("This assessment access has expired.");
  }

  if (context.token.status === "completed") {
    throw new Error("This assessment has already been completed.");
  }

  if (!context.consent.acceptedAt) {
    throw new Error("Consent is required before saving draft answers.");
  }

  assertUsableParticipant(context);
}

function normalizeDraftAnswers(
  context: ParticipantTestContext,
  answers: AnswerMap,
) {
  const allowedAnswers = new Map(
    context.definition.questions.map((question) => [
      question.id,
      new Set(question.options.map((option) => option.value)),
    ]),
  );
  const normalized: AnswerMap = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    const allowedQuestionAnswers = allowedAnswers.get(questionId);

    if (!allowedQuestionAnswers) {
      throw new Error("Draft contains an answer for an unknown question.");
    }

    if (!allowedQuestionAnswers.has(answer)) {
      throw new Error("Draft contains an invalid answer value.");
    }

    normalized[questionId] = answer;
  }

  return normalized;
}

/**
 * Clamps the stored resume position into the definition's question array.
 *
 * The value is always a 0-based index into `definition.questions`, for every
 * instrument and every presentation. A forced-choice instrument shows one group
 * per screen rather than one question per screen, and the runner stores that
 * screen as the group's MOST question index - group N is index 2 * (N - 1) - so
 * the field keeps exactly one meaning and a resumed grid still lands on the
 * group the participant left. Nothing here needs to know which presentation is
 * in play, and the bound must stay the question count rather than a screen
 * count, or a grid resume would be clamped to the first half of the instrument.
 */
function normalizeQuestionIndex(
  context: ParticipantTestContext,
  currentQuestionIndex: number,
) {
  const maxIndex = Math.max(context.definition.questions.length - 1, 0);
  return Math.min(Math.max(Math.trunc(currentQuestionIndex), 0), maxIndex);
}

/**
 * The forced-choice groups where the same option is answered on both sides.
 *
 * Driven entirely off the definition: an instrument opts in with
 * `exclusiveWithinGroup` and describes its own screens with
 * `forcedChoiceGroups`, so this service never names an instrument and an
 * instrument that declares neither is untouched. What counts as a conflict comes
 * from `@/tests/shared/forced-choice`, the single implementation the grid UI and
 * result import also call, so no two enforcement points can drift apart on it.
 *
 * A group with only one side answered is never a conflict: drafts are
 * legitimately partial and a half-filled group is a normal intermediate state.
 */
function exclusiveGroupConflicts(
  definition: TestDefinition,
  answers: Record<string, string | undefined>,
): ForcedChoiceGroupConflict[] {
  if (!definition.exclusiveWithinGroup) {
    return [];
  }

  return forcedChoiceGroupConflicts(
    definition.forcedChoiceGroups ?? [],
    answers,
  );
}

/**
 * Rejects an answer set that marks the same word both Most and Least.
 *
 * Exported so the rule can be exercised directly and reused by any other write
 * path. The message names the groups to reopen, because it is shown to the
 * participant and "invalid answers" tells them nothing they can act on.
 */
export function assertExclusiveWithinGroup(
  definition: TestDefinition,
  answers: Record<string, string | undefined>,
) {
  const conflicts = exclusiveGroupConflicts(definition, answers);

  if (conflicts.length === 0) {
    return;
  }

  throw new Error(
    `${forcedChoiceConflictGroupList(
      conflicts.map((conflict) => conflict.group),
    )} cannot use the same word for Most and Least.`,
  );
}

function normalizeQuestionTimings(
  context: ParticipantTestContext,
  timings: Record<string, number>,
) {
  const questionIds = new Set(
    context.definition.questions.map((question) => question.id),
  );
  const normalized: Record<string, number> = {};

  for (const [questionId, seconds] of Object.entries(timings)) {
    if (!questionIds.has(questionId)) {
      throw new Error("Timing data contains an unknown question.");
    }

    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new Error("Timing data contains an invalid duration.");
    }

    normalized[questionId] = Math.min(Math.trunc(seconds), 86_400);
  }

  return normalized;
}

function buildConsentTextSnapshot(context: ParticipantTestContext) {
  return [
    `Consent version: ${PARTICIPANT_CONSENT_VERSION}`,
    `Organization: ${context.client.name}`,
    `Assessment: ${context.test.name} (${context.test.version})`,
    "Data collected: assessment answers, generated score, result interpretation, access activity, timestamp, browser user agent, and hashed IP address when available.",
    "Purpose: administer the assessment, generate talent/personality insights, and provide results to the organization that issued this link.",
    `Retention: results are retained through the contract end date, ${context.client.contractEndsAt.toISOString()}, then anonymized after a ${RETENTION_DELETE_GRACE_DAYS} day grace period if the contract is not renewed.`,
    `Access: authorized users at ${context.client.name} can access participant assessment records.`,
    `Rights and deletion contact: contact ${context.client.name}'s assessment administrator to request access, correction, deletion, or other privacy rights support.`,
  ].join("\n");
}

export async function acceptParticipantConsent(
  access: ParticipantAccessCredential,
  input: AcceptParticipantConsentInput = {},
): Promise<AcceptedParticipantConsent> {
  const context = await getParticipantTestContext(access);

  if (!context) {
    throw new Error("Assessment access is invalid or unavailable.");
  }

  if (context.token.status === "expired") {
    throw new Error("This assessment access has expired.");
  }

  if (context.token.status === "completed") {
    throw new Error("This assessment has already been completed.");
  }

  if (context.demo) {
    return {
      acceptedAt: new Date(),
      consentVersion: PARTICIPANT_CONSENT_VERSION,
    };
  }

  assertUsableParticipant(context);

  if (context.consent.acceptedAt) {
    return {
      acceptedAt: context.consent.acceptedAt,
      consentVersion: context.consent.version ?? PARTICIPANT_CONSENT_VERSION,
    };
  }

  const db = getDb();
  const acceptedAt = new Date();
  const [created] = await db
    .insert(participantConsents)
    .values({
      clientId: context.client.clientId,
      participantId: context.participant.id,
      tokenId: context.token.id,
      consentVersion: PARTICIPANT_CONSENT_VERSION,
      consentTextSnapshot: buildConsentTextSnapshot(context),
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
      acceptedAt,
    })
    .onConflictDoNothing({ target: participantConsents.tokenId })
    .returning({
      acceptedAt: participantConsents.acceptedAt,
      consentVersion: participantConsents.consentVersion,
    });

  if (created) {
    return created;
  }

  const refreshed = await getParticipantTestContext(access);

  if (refreshed?.consent.acceptedAt) {
    return {
      acceptedAt: refreshed.consent.acceptedAt,
      consentVersion:
        refreshed.consent.version ?? PARTICIPANT_CONSENT_VERSION,
    };
  }

  throw new Error("Unable to record participant consent.");
}

export async function startParticipantToken(access: ParticipantAccessCredential) {
  const context = await getParticipantTestContext(access);

  if (!context || context.demo) {
    return context;
  }

  if (
    (context.token.status === "active" ||
      context.token.status === "in_progress") &&
    !context.consent.acceptedAt
  ) {
    throw new Error("Consent is required before starting the assessment.");
  }

  if (
    context.token.status === "active" ||
    context.token.status === "in_progress"
  ) {
    assertUsableParticipant(context);
  }

  if (context.token.status !== "active") {
    return context;
  }

  const now = new Date();
  const db = getDb();

  await db
    .update(participantTokens)
    .set({
      status: "in_progress",
      startedAt: now,
      lastActivityAt: now,
    })
    .where(
      and(
        eq(participantTokens.id, context.token.id),
        eq(participantTokens.clientId, context.client.clientId),
        eq(participantTokens.status, "active"),
      ),
    );

  return {
    ...context,
    token: {
      ...context.token,
      status: "in_progress" as const,
      startedAt: now,
    },
  };
}

export async function getParticipantAnswerDraft(
  access: ParticipantAccessCredential,
): Promise<ParticipantAnswerDraftDto | null> {
  const context = await getParticipantTestContext(access);

  if (!context) {
    throw new Error("Assessment access is invalid or unavailable.");
  }

  if (context.demo) {
    return null;
  }

  assertDraftableContext(context);

  const db = getDb();
  const [draft] = await db
    .select({
      answersJson: participantAnswerDrafts.answersJson,
      questionTimingsJson: participantAnswerDrafts.questionTimingsJson,
      currentQuestionIndex: participantAnswerDrafts.currentQuestionIndex,
      updatedAt: participantAnswerDrafts.updatedAt,
    })
    .from(participantAnswerDrafts)
    .where(
      and(
        eq(participantAnswerDrafts.clientId, context.client.clientId),
        eq(participantAnswerDrafts.tokenId, context.token.id),
      ),
    )
    .limit(1);

  if (!draft) {
    return null;
  }

  return {
    answers: normalizeDraftAnswers(
      context,
      Object.fromEntries(
        Object.entries(draft.answersJson).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    ),
    questionTimings: normalizeQuestionTimings(
      context,
      draft.questionTimingsJson,
    ),
    currentQuestionIndex: normalizeQuestionIndex(
      context,
      draft.currentQuestionIndex,
    ),
    updatedAt: draft.updatedAt,
  };
}

export async function saveParticipantAnswerDraft(
  access: ParticipantAccessCredential,
  input: {
    answers: AnswerMap;
    questionTimings: Record<string, number>;
    currentQuestionIndex: number;
  },
): Promise<ParticipantAnswerDraftDto | null> {
  const context = await getParticipantTestContext(access);

  if (!context) {
    throw new Error("Assessment access is invalid or unavailable.");
  }

  // A draft is allowed to be partial, but never to hold a group whose two sides
  // carry the same word: that state is invalid at every other boundary, and
  // autosaving it would resume the participant straight back into it. Reading a
  // draft deliberately does not run this check, so an already-stored draft still
  // loads and can be corrected rather than locking the participant out.
  //
  // Ahead of the demo short-circuit on purpose. A demo access persists nothing,
  // but it is how the grid is exercised without a real assignment, and submit
  // validates a demo run too; a demo draft that answered 200 to a request every
  // other path refuses would make the demo useless for catching exactly that.
  assertExclusiveWithinGroup(context.definition, input.answers);

  if (context.demo) {
    return null;
  }

  assertDraftableContext(context);

  const now = new Date();
  const answers = normalizeDraftAnswers(context, input.answers);
  const questionTimings = normalizeQuestionTimings(
    context,
    input.questionTimings,
  );
  const currentQuestionIndex = normalizeQuestionIndex(
    context,
    input.currentQuestionIndex,
  );
  const db = getDb();
  const [draft] = await db
    .insert(participantAnswerDrafts)
    .values({
      clientId: context.client.clientId,
      participantId: context.participant.id,
      tokenId: context.token.id,
      answersJson: answers,
      questionTimingsJson: questionTimings,
      currentQuestionIndex,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: participantAnswerDrafts.tokenId,
      set: {
        clientId: context.client.clientId,
        participantId: context.participant.id,
        answersJson: answers,
        questionTimingsJson: questionTimings,
        currentQuestionIndex,
        updatedAt: now,
      },
    })
    .returning({
      answersJson: participantAnswerDrafts.answersJson,
      questionTimingsJson: participantAnswerDrafts.questionTimingsJson,
      currentQuestionIndex: participantAnswerDrafts.currentQuestionIndex,
      updatedAt: participantAnswerDrafts.updatedAt,
    });

  if (!draft) {
    throw new Error("Unable to save draft answers.");
  }

  await db
    .update(participantTokens)
    .set({ lastActivityAt: now })
    .where(
      and(
        eq(participantTokens.id, context.token.id),
        eq(participantTokens.clientId, context.client.clientId),
        inArray(participantTokens.status, ["active", "in_progress"]),
      ),
    );

  return {
    answers: normalizeDraftAnswers(
      context,
      Object.fromEntries(
        Object.entries(draft.answersJson).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
    ),
    questionTimings: normalizeQuestionTimings(
      context,
      draft.questionTimingsJson,
    ),
    currentQuestionIndex: draft.currentQuestionIndex,
    updatedAt: draft.updatedAt,
  };
}

export async function clearParticipantAnswerDraft(
  access: ParticipantAccessCredential,
) {
  const context = await getParticipantTestContext(access);

  if (!context || context.demo) {
    return;
  }

  const db = getDb();
  await db
    .delete(participantAnswerDrafts)
    .where(
      and(
        eq(participantAnswerDrafts.clientId, context.client.clientId),
        eq(participantAnswerDrafts.tokenId, context.token.id),
      ),
    );
}

export async function submitParticipantResult(
  access: ParticipantAccessCredential,
  answers: AnswerMap,
  questionTimings: Record<string, number> = {},
): Promise<SubmitParticipantResult> {
  const context = await getParticipantTestContext(access);

  if (!context) {
    throw new Error("Assessment access is invalid or unavailable.");
  }

  if (context.token.status === "expired") {
    throw new Error("This assessment access has expired.");
  }

  if (context.token.status === "completed") {
    throw new Error("This assessment has already been completed.");
  }

  // Checked before scoring, and before the demo short-circuit further down, so
  // the participant gets the group they need to reopen instead of a generic
  // scoring error. Scoring itself keeps tolerating an equal pair on purpose - a
  // legacy stored result must still render - which is exactly why submit has to
  // be the one to refuse it.
  assertExclusiveWithinGroup(context.definition, answers);

  const score = context.definition.score(answers);
  const normalizedQuestionTimings = normalizeQuestionTimings(
    context,
    questionTimings,
  );
  const submittedAt = new Date();
  const durationSeconds = context.token.startedAt
    ? Math.max(
        0,
        Math.min(
          Math.floor(
            (submittedAt.getTime() - context.token.startedAt.getTime()) / 1000,
          ),
          2_147_483_647,
        ),
      )
    : Object.values(normalizedQuestionTimings).reduce(
        (total, seconds) => total + seconds,
        0,
      );

  if (context.demo) {
    return {
      score,
      persisted: false,
      durationSeconds,
    };
  }

  if (!context.consent.acceptedAt) {
    throw new Error("Consent is required before submitting the assessment.");
  }

  assertUsableParticipant(context);

  const db = getDb();

  await db.insert(results).values({
    clientId: context.client.clientId,
    testId: context.test.id,
    tokenId: context.token.id,
    participantId: context.participant.id,
    rawAnswers: answers,
    questionTimings: normalizedQuestionTimings,
    durationSeconds,
    scoredResult: score.result,
    scoreSummary: score.summary,
    interpretation: score.interpretation,
    submittedAt,
    retentionUntil: retentionUntilContractEnd(context.client.contractEndsAt),
  });

  await db.execute(sql`
    with completed_token as (
      update participant_tokens
      set
        status = 'completed'::token_status,
        completed_at = ${submittedAt},
        last_activity_at = ${submittedAt}
      where
        id = ${context.token.id}
        and client_id = ${context.client.clientId}
        and status in ('active'::token_status, 'in_progress'::token_status)
      returning client_id, test_id
    )
    update client_test_quotas
    set
      quota_used = client_test_quotas.quota_consumed + 1 + greatest(client_test_quotas.quota_reserved - 1, 0),
      quota_reserved = greatest(client_test_quotas.quota_reserved - 1, 0),
      quota_consumed = client_test_quotas.quota_consumed + 1,
      updated_at = ${submittedAt}
    from completed_token
    where
      client_test_quotas.client_id = completed_token.client_id
      and client_test_quotas.test_id = completed_token.test_id
  `);

  await db
    .delete(participantAnswerDrafts)
    .where(
      and(
        eq(participantAnswerDrafts.clientId, context.client.clientId),
        eq(participantAnswerDrafts.tokenId, context.token.id),
      ),
    );

  return {
    score,
    persisted: true,
    durationSeconds,
  };
}

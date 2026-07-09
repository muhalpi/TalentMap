import { config } from "dotenv";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { getDb } from "../src/db/client";
import { participantTokens, participants, results } from "../src/db/schema";

config({ path: ".env.local" });

type TokenToBackfill = {
  id: string;
  clientId: string;
  tokenPreview: string | null;
  participantReference: string | null;
};

function participantNameForToken(token: TokenToBackfill) {
  const reference = token.participantReference?.trim();

  if (reference) {
    return reference;
  }

  const preview = token.tokenPreview?.trim() || token.id.slice(0, 8);
  return `Participant ${preview}`;
}

function legacyExternalReferenceForToken(tokenId: string) {
  return `legacy-token:${tokenId}`;
}

async function findTokensToBackfill() {
  const db = getDb();

  return db
    .select({
      id: participantTokens.id,
      clientId: participantTokens.clientId,
      tokenPreview: participantTokens.tokenPreview,
      participantReference: participantTokens.participantReference,
    })
    .from(participantTokens)
    .where(isNull(participantTokens.participantId))
    .orderBy(asc(participantTokens.createdAt), asc(participantTokens.id));
}

async function getOrCreateBackfilledParticipant(token: TokenToBackfill) {
  const db = getDb();
  const externalReference = legacyExternalReferenceForToken(token.id);

  const [created] = await db
    .insert(participants)
    .values({
      clientId: token.clientId,
      name: participantNameForToken(token),
      externalReference,
      metadata: {
        backfillSource: "participant_tokens",
        backfilledFromTokenId: token.id,
      },
    })
    .onConflictDoNothing({
      target: [participants.clientId, participants.externalReference],
      where: sql`${participants.externalReference} is not null`,
    })
    .returning({ id: participants.id });

  if (created) {
    return { id: created.id, created: true };
  }

  const [existing] = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.clientId, token.clientId),
        eq(participants.externalReference, externalReference),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error(`Failed to find participant for token ${token.id}.`);
  }

  return { id: existing.id, created: false };
}

async function backfillToken(token: TokenToBackfill) {
  const db = getDb();
  const [currentToken] = await db
    .select({ participantId: participantTokens.participantId })
    .from(participantTokens)
    .where(
      and(
        eq(participantTokens.id, token.id),
        eq(participantTokens.clientId, token.clientId),
      ),
    )
    .limit(1);

  if (!currentToken || currentToken.participantId) {
    return { createdParticipant: false, updatedResults: 0 };
  }

  const participant = await getOrCreateBackfilledParticipant(token);

  const [updatedToken] = await db
    .update(participantTokens)
    .set({ participantId: participant.id })
    .where(
      and(
        eq(participantTokens.id, token.id),
        eq(participantTokens.clientId, token.clientId),
        isNull(participantTokens.participantId),
      ),
    )
    .returning({ id: participantTokens.id });

  if (!updatedToken) {
    return { createdParticipant: participant.created, updatedResults: 0 };
  }

  const updatedResults = await db
    .update(results)
    .set({ participantId: participant.id })
    .where(
      and(
        eq(results.clientId, token.clientId),
        eq(results.tokenId, token.id),
        isNull(results.participantId),
      ),
    )
    .returning({ id: results.id });

  return {
    createdParticipant: participant.created,
    updatedResults: updatedResults.length,
  };
}

async function backfillResultsFromLinkedTokens() {
  const db = getDb();

  const pendingResults = await db
    .select({
      resultId: results.id,
      clientId: results.clientId,
      tokenId: results.tokenId,
      participantId: participantTokens.participantId,
    })
    .from(results)
    .innerJoin(
      participantTokens,
      and(
        eq(participantTokens.id, results.tokenId),
        eq(participantTokens.clientId, results.clientId),
      ),
    )
    .where(
      and(
        isNull(results.participantId),
        isNotNull(participantTokens.participantId),
      ),
    );

  let updated = 0;

  for (const pending of pendingResults) {
    if (!pending.participantId) {
      continue;
    }

    const updatedResults = await db
      .update(results)
      .set({ participantId: pending.participantId })
      .where(
        and(
          eq(results.id, pending.resultId),
          eq(results.clientId, pending.clientId),
          eq(results.tokenId, pending.tokenId),
          isNull(results.participantId),
        ),
      )
      .returning({ id: results.id });

    updated += updatedResults.length;
  }

  return updated;
}

async function backfillParticipants() {
  const tokens = await findTokensToBackfill();
  let createdParticipants = 0;
  let updatedResults = 0;

  for (const token of tokens) {
    const result = await backfillToken(token);

    if (result.createdParticipant) {
      createdParticipants += 1;
    }

    updatedResults += result.updatedResults;
  }

  updatedResults += await backfillResultsFromLinkedTokens();

  console.log(
    JSON.stringify(
      {
        scannedTokensWithoutParticipant: tokens.length,
        createdParticipants,
        updatedResults,
      },
      null,
      2,
    ),
  );
}

backfillParticipants().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

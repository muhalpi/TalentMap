import assert from "node:assert/strict";
import test from "node:test";

import { dashboardTokenRequestSchema } from "./request";

const participantId = "00000000-0000-4000-8000-000000000001";

test("accepts BFI access requests for a registered participant", () => {
  const parsed = dashboardTokenRequestSchema.parse({
    testKey: "bfi",
    participantId,
  });

  assert.equal(parsed.testKey, "bfi");
  assert.equal(parsed.participantId, participantId);
});

test("continues to accept MBTI access requests", () => {
  const parsed = dashboardTokenRequestSchema.parse({
    testKey: "mbti",
    participantId,
  });

  assert.equal(parsed.testKey, "mbti");
});

test("requires a registered participant identity", () => {
  assert.throws(
    () => dashboardTokenRequestSchema.parse({ testKey: "bfi" }),
    /Select a participant/,
  );
});

test("rejects instruments that are not implemented for client delivery", () => {
  assert.throws(
    () =>
      dashboardTokenRequestSchema.parse({ testKey: "papi", participantId }),
    /Invalid option/,
  );
});

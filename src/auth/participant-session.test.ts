import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeParticipantSession,
  encodeParticipantSession,
  type ParticipantSessionAccess,
} from "./participant-session";

test("round-trips a versioned participant assignment session", () => {
  const access: ParticipantSessionAccess = {
    kind: "assignment",
    assignmentId: "00000000-0000-4000-8000-000000000001",
    accessVersion: 3,
  };

  assert.deepEqual(
    decodeParticipantSession(encodeParticipantSession(access)),
    access,
  );
});

test("rejects a participant session after signature tampering", () => {
  const session = encodeParticipantSession({
    kind: "demo",
    demoKey: "bfi",
  });
  const tampered = `${session.slice(0, -1)}${session.endsWith("a") ? "b" : "a"}`;

  assert.equal(decodeParticipantSession(tampered), null);
});

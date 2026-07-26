import assert from "node:assert/strict";
import test from "node:test";

import {
  generateParticipantAccessCode,
  hashParticipantAccessCode,
  normalizeParticipantAccessCode,
} from "./crypto";

test("generates a human-readable participant access code", () => {
  const code = generateParticipantAccessCode();

  assert.match(code, /^TM-(?:[A-HJ-NP-Z2-9]{4}-){3}[A-HJ-NP-Z2-9]{4}$/);
});

test("normalizes casing, spaces, and dashes before hashing", () => {
  const code = "TM-ABCD-EFGH-JKLM-NPQR";

  assert.equal(
    normalizeParticipantAccessCode(" tm abcd-efgh jklm-npqr "),
    "TMABCDEFGHJKLMNPQR",
  );
  assert.equal(
    hashParticipantAccessCode(code),
    hashParticipantAccessCode("tm abcd efgh jklm npqr"),
  );
});

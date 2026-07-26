import assert from "node:assert/strict";
import test from "node:test";

import { resolveTestRateLimitPolicy } from "./test-rate-limit-service";

test("keeps participant assessment page limits unchanged", () => {
  const policy = resolveTestRateLimitPolicy({
    rawToken: "tm_real-participant-token",
    scope: "test_page",
  });

  assert.equal(policy.demo, false);
  assert.equal(policy.bucketScope, "test_page");
  assert.equal(policy.limit, 80);
  assert.equal(policy.windowMs, 10 * 60 * 1000);
  assert.equal(policy.blockMs, 10 * 60 * 1000);
});

test("uses stricter per-code limits plus a wider IP access bucket", () => {
  const codePolicy = resolveTestRateLimitPolicy({
    rawToken: "TM-ABCD-EFGH-JKLM-NPQR",
    scope: "test_access_code",
  });
  const ipPolicy = resolveTestRateLimitPolicy({
    rawToken: "participant-access-ip-bucket",
    scope: "test_access_ip",
  });

  assert.equal(codePolicy.limit, 8);
  assert.equal(codePolicy.blockMs, 30 * 60 * 1000);
  assert.equal(ipPolicy.limit, 60);
  assert.equal(ipPolicy.blockMs, 30 * 60 * 1000);
});

test("uses a separate relaxed page bucket for demo tokens", () => {
  const policy = resolveTestRateLimitPolicy({
    rawToken: "demo-bfi",
    scope: "test_page",
  });

  assert.equal(policy.demo, true);
  assert.equal(policy.bucketScope, "demo_test_page");
  assert.equal(policy.limit, 800);
  assert.equal(policy.windowMs, 10 * 60 * 1000);
  assert.equal(policy.blockMs, 2 * 60 * 1000);
});

test("allows repeated demo autosaves without changing real draft limits", () => {
  const demoPolicy = resolveTestRateLimitPolicy({
    rawToken: "demo-mbti",
    scope: "test_api_draft",
  });
  const participantPolicy = resolveTestRateLimitPolicy({
    rawToken: "tm_real-participant-token",
    scope: "test_api_draft",
  });

  assert.equal(demoPolicy.bucketScope, "demo_test_api_draft");
  assert.equal(demoPolicy.limit, 2_400);
  assert.equal(participantPolicy.bucketScope, "test_api_draft");
  assert.equal(participantPolicy.limit, 240);
});

test("does not treat lookalike tokens as demos", () => {
  const policy = resolveTestRateLimitPolicy({
    rawToken: "demo-bfi-copy",
    scope: "test_page",
  });

  assert.equal(policy.demo, false);
  assert.equal(policy.bucketScope, "test_page");
  assert.equal(policy.limit, 80);
});

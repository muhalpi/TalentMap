import assert from "node:assert/strict";
import test from "node:test";

import { bfiDefinition } from "./instruments/bfi/definition";
import {
  currentImplementedTestRows,
  isCurrentImplementedTest,
} from "./registry";

test("recognizes only the current implemented BFI version", () => {
  assert.equal(
    isCurrentImplementedTest("bfi", bfiDefinition.version),
    true,
  );
  assert.equal(
    isCurrentImplementedTest("bfi", "ipip-bfm-50-en-1.0.0"),
    false,
  );
});

test("does not expose reserved instruments for client delivery", () => {
  assert.equal(isCurrentImplementedTest("papi", "pending-adaptation"), false);
});

test("selects the current scoring row when a tenant retains an older version", () => {
  const current = {
    testKey: "bfi",
    version: bfiDefinition.version,
    quotaTotal: 250,
  };
  const rows = currentImplementedTestRows([
    {
      testKey: "bfi",
      version: "ipip-bfm-50-en-1.0.0",
      quotaTotal: 50,
    },
    current,
  ]);

  assert.deepEqual(rows, [current]);
});

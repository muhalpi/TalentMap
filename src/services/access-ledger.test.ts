import assert from "node:assert/strict";
import test from "node:test";

import { mergeAccessLedgerRows } from "./access-ledger";

test("pins every live assignment ahead of recent access without duplicates", () => {
  const liveRows = [
    { id: "old-live-alpha", label: "Alpha MBTI" },
    { id: "recent-live-beta", label: "Beta MBTI" },
  ];
  const recentRows = [
    { id: "recent-live-beta", label: "Beta MBTI" },
    { id: "recent-completed", label: "Beta BFI" },
  ];

  assert.deepEqual(mergeAccessLedgerRows(liveRows, recentRows), [
    { id: "old-live-alpha", label: "Alpha MBTI" },
    { id: "recent-live-beta", label: "Beta MBTI" },
    { id: "recent-completed", label: "Beta BFI" },
  ]);
});

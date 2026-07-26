import assert from "node:assert/strict";
import test from "node:test";

import {
  parseParticipantDirectoryQuery,
  participantDirectoryHref,
} from "./participant-directory-query";

test("normalizes participant directory query parameters", () => {
  assert.deepEqual(
    parseParticipantDirectoryQuery({
      q: "  Product  ",
      status: "archived",
      activity: "has_results",
      sort: "name",
      page: "3",
    }),
    {
      search: "Product",
      status: "archived",
      activity: "has_results",
      sort: "name",
      page: 3,
    },
  );
});

test("rejects unsupported filters and invalid pages", () => {
  assert.deepEqual(parseParticipantDirectoryQuery({ status: "deleted", page: "-2" }), {
    search: "",
    status: "all",
    activity: "all",
    sort: "recent",
    page: 1,
  });
});

test("preserves active participant filters in pagination links", () => {
  assert.equal(
    participantDirectoryHref(
      {
        search: "Ada Lovelace",
        status: "active",
        activity: "live_access",
        sort: "name",
        page: 1,
      },
      2,
    ),
    "/dashboard/participants?q=Ada+Lovelace&status=active&activity=live_access&sort=name&page=2",
  );
});

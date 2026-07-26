import assert from "node:assert/strict";
import test from "node:test";

import {
  getTokenActionError,
  getTokenActionNetworkError,
} from "./token-action-response";

test("keeps a specific JSON action error", async () => {
  const response = Response.json(
    { error: "Access can only be rotated for a live assessment." },
    { status: 400 },
  );

  assert.equal(
    await getTokenActionError(response, "Unable to rotate."),
    "Access can only be rotated for a live assessment.",
  );
});

test("turns an HTML 404 into an actionable service error", async () => {
  const response = new Response("<html>Not found</html>", {
    status: 404,
    headers: { "Content-Type": "text/html" },
  });

  assert.equal(
    await getTokenActionError(response, "Unable to rotate."),
    "The assessment access service is temporarily unavailable. Refresh the page and try again.",
  );
});

test("includes the HTTP status when no API error is available", async () => {
  const response = new Response(null, { status: 503 });

  assert.equal(
    await getTokenActionError(response, "Unable to rotate."),
    "Unable to rotate. (HTTP 503)",
  );
});

test("provides an actionable network failure", () => {
  assert.equal(
    getTokenActionNetworkError("cancel"),
    "Unable to cancel assessment access because the service could not be reached. Check your connection and try again.",
  );
});

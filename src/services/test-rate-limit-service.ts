import { createHmac } from "node:crypto";

import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { hashParticipantToken } from "@/lib/crypto";

export type TestRateLimitScope =
  | "test_page"
  | "test_api_consent"
  | "test_api_start"
  | "test_api_draft"
  | "test_api_submit"
  | "test_invalid_token";

type HeaderReader = Pick<Headers, "get">;

interface RateLimitPolicy {
  limit: number;
  windowMs: number;
  blockMs: number;
}

interface RateLimitRow extends Record<string, unknown> {
  request_count: number | string | bigint;
  window_ends_at: Date | string;
  blocked_until: Date | string | null;
}

export class RateLimitExceededError extends Error {
  readonly retryAfterSeconds: number;
  readonly resetAt: Date;

  constructor({
    retryAfterSeconds,
    resetAt,
  }: {
    retryAfterSeconds: number;
    resetAt: Date;
  }) {
    super("Too many attempts. Try again later.");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.resetAt = resetAt;
  }
}

const RATE_LIMIT_POLICIES: Record<TestRateLimitScope, RateLimitPolicy> = {
  test_page: {
    limit: 80,
    windowMs: 10 * 60 * 1000,
    blockMs: 10 * 60 * 1000,
  },
  test_api_consent: {
    limit: 30,
    windowMs: 10 * 60 * 1000,
    blockMs: 10 * 60 * 1000,
  },
  test_api_start: {
    limit: 60,
    windowMs: 10 * 60 * 1000,
    blockMs: 10 * 60 * 1000,
  },
  test_api_draft: {
    limit: 240,
    windowMs: 10 * 60 * 1000,
    blockMs: 10 * 60 * 1000,
  },
  test_api_submit: {
    limit: 20,
    windowMs: 10 * 60 * 1000,
    blockMs: 20 * 60 * 1000,
  },
  test_invalid_token: {
    limit: 8,
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  },
};

function rateLimitSecret() {
  return (
    process.env.RATE_LIMIT_HASH_SECRET ??
    process.env.AUTH_SECRET ??
    "talentmap-local-development-secret"
  );
}

function hmac(value: string) {
  return createHmac("sha256", rateLimitSecret()).update(value).digest("hex");
}

function clientIp(headers: HeaderReader) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    forwarded ??
    "unknown"
  );
}

function toDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    return new Date(value);
  }

  return null;
}

function toNumber(value: number | string | bigint | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10);
  }

  return 0;
}

function retryAfterSeconds(now: Date, resetAt: Date) {
  return Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
}

export function rateLimitResponseHeaders(error: RateLimitExceededError) {
  return {
    "Retry-After": String(error.retryAfterSeconds),
    "X-RateLimit-Reset": error.resetAt.toISOString(),
  };
}

export async function enforceTestTokenRateLimit({
  rawToken,
  headers,
  scope,
}: {
  rawToken: string;
  headers: HeaderReader;
  scope: TestRateLimitScope;
}) {
  const policy = RATE_LIMIT_POLICIES[scope];
  const now = new Date();
  const windowEndsAt = new Date(now.getTime() + policy.windowMs);
  const blockUntil = new Date(now.getTime() + policy.blockMs);
  const tokenHash = hashParticipantToken(rawToken);
  const ipHash = hmac(clientIp(headers));
  const keyHash = hmac(`${scope}:${ipHash}:${tokenHash}`);
  const db = getDb();
  const result = await db.execute<RateLimitRow>(sql`
    insert into test_rate_limit_buckets (
      key_hash,
      token_hash,
      ip_hash,
      route_scope,
      request_count,
      window_start,
      window_ends_at,
      blocked_until,
      last_request_at,
      created_at
    )
    values (
      ${keyHash},
      ${tokenHash},
      ${ipHash},
      ${scope},
      1,
      ${now},
      ${windowEndsAt},
      null,
      ${now},
      ${now}
    )
    on conflict (key_hash) do update
    set
      token_hash = excluded.token_hash,
      ip_hash = excluded.ip_hash,
      route_scope = excluded.route_scope,
      request_count = case
        when test_rate_limit_buckets.window_ends_at <= ${now} then 1
        else test_rate_limit_buckets.request_count + 1
      end,
      window_start = case
        when test_rate_limit_buckets.window_ends_at <= ${now} then ${now}
        else test_rate_limit_buckets.window_start
      end,
      window_ends_at = case
        when test_rate_limit_buckets.window_ends_at <= ${now} then ${windowEndsAt}
        else test_rate_limit_buckets.window_ends_at
      end,
      blocked_until = case
        when test_rate_limit_buckets.blocked_until is not null
          and test_rate_limit_buckets.blocked_until > ${now}
          then test_rate_limit_buckets.blocked_until
        when test_rate_limit_buckets.window_ends_at <= ${now} then null
        when test_rate_limit_buckets.request_count + 1 > ${policy.limit}
          then ${blockUntil}
        else null
      end,
      last_request_at = ${now}
    returning request_count, window_ends_at, blocked_until
  `);

  const row = result.rows[0];
  const blockedUntil = toDate(row?.blocked_until);
  const windowResetAt = toDate(row?.window_ends_at) ?? windowEndsAt;
  const count = toNumber(row?.request_count);

  if (blockedUntil && blockedUntil.getTime() > now.getTime()) {
    throw new RateLimitExceededError({
      retryAfterSeconds: retryAfterSeconds(now, blockedUntil),
      resetAt: blockedUntil,
    });
  }

  if (count > policy.limit) {
    throw new RateLimitExceededError({
      retryAfterSeconds: retryAfterSeconds(now, windowResetAt),
      resetAt: windowResetAt,
    });
  }
}

export async function enforceInvalidTokenRateLimit({
  rawToken,
  headers,
}: {
  rawToken: string;
  headers: HeaderReader;
}) {
  return enforceTestTokenRateLimit({
    rawToken,
    headers,
    scope: "test_invalid_token",
  });
}

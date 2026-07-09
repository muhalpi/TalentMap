import { timingSafeEqual } from "node:crypto";

import { runQuotaReservationCleanup } from "@/services/quota-reservation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configuredSecrets() {
  return [
    process.env.QUOTA_RESERVATION_JOB_SECRET,
    process.env.QUOTA_JOB_SECRET,
    process.env.CRON_SECRET,
  ].filter((secret): secret is string => Boolean(secret));
}

function requestSecret(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return (
    request.headers.get("x-quota-reservation-secret")?.trim() ??
    request.headers.get("x-quota-secret")?.trim() ??
    ""
  );
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function runAuthorizedQuotaReservationCleanup(request: Request) {
  const secrets = configuredSecrets();

  if (secrets.length === 0) {
    return Response.json(
      {
        error:
          "QUOTA_RESERVATION_JOB_SECRET, QUOTA_JOB_SECRET, or CRON_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  const suppliedSecret = requestSecret(request);

  if (!secrets.some((secret) => safeEquals(suppliedSecret, secret))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runQuotaReservationCleanup();

  return Response.json({
    ok: true,
    result,
  });
}

export async function GET(request: Request) {
  return runAuthorizedQuotaReservationCleanup(request);
}

export async function POST(request: Request) {
  return runAuthorizedQuotaReservationCleanup(request);
}

import { timingSafeEqual } from "node:crypto";

import { runRetentionSweep } from "@/services/retention-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configuredSecrets() {
  return [process.env.RETENTION_JOB_SECRET, process.env.CRON_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
}

function requestSecret(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-retention-secret")?.trim() ?? "";
}

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

async function runAuthorizedRetentionSweep(request: Request) {
  const secrets = configuredSecrets();

  if (secrets.length === 0) {
    return Response.json(
      {
        error: "RETENTION_JOB_SECRET or CRON_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  const suppliedSecret = requestSecret(request);

  if (!secrets.some((secret) => safeEquals(suppliedSecret, secret))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runRetentionSweep();

  return Response.json({
    ok: true,
    result,
  });
}

export async function GET(request: Request) {
  return runAuthorizedRetentionSweep(request);
}

export async function POST(request: Request) {
  return runAuthorizedRetentionSweep(request);
}

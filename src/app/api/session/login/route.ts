import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createClientSessionToken,
  createInternalAdminSessionToken,
} from "@/auth/login-service";
import { SESSION_COOKIE, sessionCookieOptions } from "@/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  role: z.enum(["internal_admin", "client"]),
  next: z.string().optional(),
});

function safeRedirectPath(value: string | undefined, role: string) {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return role === "internal_admin" ? "/admin" : "/dashboard";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const parsed = loginSchema.parse({
      role: formData.get("role"),
      next: formData.get("next"),
    });
    const token =
      parsed.role === "internal_admin"
        ? await createInternalAdminSessionToken()
        : await createClientSessionToken();
    const response = NextResponse.redirect(
      new URL(safeRedirectPath(parsed.next, parsed.role), request.url),
      { status: 303 },
    );

    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create session.",
      },
      { status: 400 },
    );
  }
}

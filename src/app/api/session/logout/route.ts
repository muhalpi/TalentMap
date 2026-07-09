import { NextResponse } from "next/server";

import {
  expiredSessionCookieOptions,
  SESSION_COOKIE,
} from "@/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });

  response.cookies.set(SESSION_COOKIE, "", expiredSessionCookieOptions());
  return response;
}

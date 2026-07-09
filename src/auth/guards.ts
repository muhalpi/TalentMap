import { redirect } from "next/navigation";

import {
  getClientSession,
  getInternalAdminSession,
  type ClientSession,
  type InternalAdminSession,
} from "@/auth/session";

export async function requireInternalAdminSession(): Promise<InternalAdminSession> {
  const session = await getInternalAdminSession();

  if (!session) {
    redirect("/login?next=/admin");
  }

  return session;
}

export async function requireClientSession(): Promise<ClientSession> {
  const session = await getClientSession();

  if (!session) {
    redirect("/login?next=/dashboard");
  }

  return session;
}

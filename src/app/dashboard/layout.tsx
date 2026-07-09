import { requireClientSession } from "@/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { getClientDashboardByClientId } from "@/services/dashboard-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clientNav = [
  { href: "/dashboard", label: "Overview", icon: "dashboard" as const },
  {
    href: "/dashboard/participants",
    label: "Participants",
    icon: "participants" as const,
  },
  { href: "/dashboard/tokens", label: "Tokens", icon: "tokens" as const },
  { href: "/dashboard/results", label: "Results", icon: "results" as const },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireClientSession();
  const dashboard = await getClientDashboardByClientId(session.clientId);

  return (
    <AppShell
      roleLabel="Client"
      userEmail={session.email}
      contextLabel={dashboard?.client.name ?? "Client Dashboard"}
      navItems={clientNav}
    >
      {children}
    </AppShell>
  );
}

import { requireInternalAdminSession } from "@/auth/guards";
import { AppShell } from "@/components/layout/app-shell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const adminNav = [
  { href: "/admin", label: "Overview", icon: "dashboard" as const },
  { href: "/admin/clients", label: "Clients", icon: "clients" as const },
  { href: "/admin/instruments", label: "Instruments", icon: "tests" as const },
  { href: "/admin/retention", label: "Retention", icon: "retention" as const },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireInternalAdminSession();

  return (
    <AppShell
      roleLabel="Internal Admin"
      userEmail={session.email}
      contextLabel="Provisioning"
      navItems={adminNav}
    >
      {children}
    </AppShell>
  );
}

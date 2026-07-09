"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  Database,
  FileText,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";

type IconName =
  | "dashboard"
  | "clients"
  | "tokens"
  | "participants"
  | "results"
  | "tests"
  | "retention"
  | "admin"
  | "reports";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface AppShellProps {
  roleLabel: string;
  userEmail: string;
  contextLabel: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

const iconMap = {
  dashboard: LayoutDashboard,
  clients: Building2,
  tokens: KeyRound,
  participants: UsersRound,
  results: BarChart3,
  tests: ClipboardList,
  retention: CalendarClock,
  admin: ShieldCheck,
  reports: FileText,
} satisfies Record<IconName, typeof LayoutDashboard>;

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  roleLabel,
  userEmail,
  contextLabel,
  navItems,
  children,
}: AppShellProps) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[264px_1fr]">
        <aside className="border-b border-border bg-surface lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-5 py-6">
              <Link href="/" className="block">
                <p className="font-mono text-xs uppercase tracking-wide text-accent">
                  TalentMap
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-normal">
                  Assessment Ops
                </h1>
              </Link>
            </div>

            <div className="border-b border-border p-4">
              <div className="rounded-xl border border-border bg-background p-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
                <div className="flex items-center gap-2">
                  <Database className="text-accent" size={16} />
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
                    {roleLabel}
                  </p>
                </div>
                <p className="mt-2 truncate text-sm font-medium">
                  {contextLabel}
                </p>
                <p className="mt-1 truncate font-mono text-xs text-foreground/55">
                  {userEmail}
                </p>
              </div>
            </div>

            <nav className="grid gap-1 p-3">
              {navItems.map((item) => {
                const Icon = iconMap[item.icon];
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`grid h-10 grid-cols-[20px_1fr] items-center gap-3 rounded-md border px-3 text-sm font-medium ${
                      active
                        ? "border-border bg-surface-muted text-foreground shadow-[inset_3px_0_0_var(--accent)]"
                        : "border-transparent text-foreground/68 hover:border-border hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className={active ? "text-accent" : ""} size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-border p-4">
              <SignOutButton />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mx-auto max-w-7xl px-5 py-7 lg:px-10">{children}</div>
        </section>
      </div>
    </main>
  );
}

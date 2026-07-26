"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
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
  section?: string;
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

function personName(email: string) {
  const localPart = email.split("@")[0] ?? "Workspace admin";
  const words = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(" ") || "Workspace admin";
}

export function AppShell({
  roleLabel,
  userEmail,
  contextLabel,
  navItems,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const name = personName(userEmail);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  const navSections = navItems.reduce<
    { label: string; items: NavItem[] }[]
  >((sections, item) => {
    const label = item.section ?? "";
    const current = sections.at(-1);

    if (!current || current.label !== label) {
      sections.push({ label, items: [item] });
    } else {
      current.items.push(item);
    }

    return sections;
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="min-h-screen lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[#061a38] text-white shadow-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0 lg:shadow-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex h-16 shrink-0 items-center justify-between px-5">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-blue-600 shadow-[0_7px_18px_rgb(37_99_235/0.35)]">
                  <Sparkles size={17} strokeWidth={2.2} />
                </span>
                <span className="text-[19px]">TalentMap</span>
              </Link>
              <button
                type="button"
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={19} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-2.5 pb-5 pt-2">
              {navSections.map((section) => (
                <div key={section.label || "primary"} className="mb-5">
                  {section.label ? (
                    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100/55">
                      {section.label}
                    </p>
                  ) : null}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = iconMap[item.icon];
                      const active = isActive(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                            active
                              ? "bg-blue-500/20 text-white shadow-[inset_0_0_0_1px_rgb(96_165_250/0.12)]"
                              : "text-blue-50/78 hover:bg-white/[0.07] hover:text-white"
                          }`}
                        >
                          <Icon
                            className={active ? "text-blue-300" : "text-blue-100/70"}
                            size={17}
                            strokeWidth={1.8}
                          />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="shrink-0 border-t border-white/10 p-3">
              <a
                href="mailto:support@talentmap.example"
                className="mb-2 flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-blue-50/78 hover:bg-white/[0.07] hover:text-white"
              >
                <LifeBuoy size={17} strokeWidth={1.8} />
                Help &amp; Support
              </a>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/85 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-600 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={19} />
              </button>
              <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                <span>Client</span>
                <div className="flex h-9 max-w-64 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-sm">
                  <span className="truncate">{contextLabel}</span>
                  <ChevronDown className="shrink-0 text-slate-400" size={14} />
                </div>
              </div>
              <p className="truncate text-sm font-semibold text-slate-800 sm:hidden">
                {contextLabel}
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
              <details className="group relative">
                <summary className="relative grid size-9 cursor-pointer list-none place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 [&::-webkit-details-marker]:hidden">
                  <Bell size={18} />
                  <span className="absolute right-1 top-0.5 grid size-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                    3
                  </span>
                  <span className="sr-only">Notifications</span>
                </summary>
                <div className="absolute right-0 top-11 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Dashboard metrics update automatically as assessments move through the workflow.
                  </p>
                </div>
              </details>
              <a
                href="mailto:support@talentmap.example"
                aria-label="Contact support"
                className="hidden size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:grid"
              >
                <CircleHelp size={18} />
              </a>
              <span className="hidden h-7 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-bold text-blue-700 ring-2 ring-white shadow-sm">
                  {initials}
                </span>
                <div className="hidden min-w-0 md:block">
                  <p className="max-w-36 truncate text-xs font-semibold text-slate-800">
                    {name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{roleLabel}</p>
                </div>
                <ChevronDown className="hidden text-slate-400 md:block" size={14} />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-7 lg:py-7">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

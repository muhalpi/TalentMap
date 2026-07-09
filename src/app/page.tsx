import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

import { testCatalog } from "@/tests/registry";

const systemStats = [
  { label: "Tenant model", value: "client_id", detail: "Required on client data" },
  { label: "Token states", value: "4", detail: "Active to completed lifecycle" },
  { label: "Adapted tests", value: "1 / 7", detail: "MBTI is wired first" },
  { label: "Storage", value: "Neon", detail: "Postgres plus JSONB scoring" },
];

const workflows = [
  {
    icon: Building2,
    title: "Internal provisioning",
    body: "Create clients, set contract windows, unlock instruments, and assign quotas.",
  },
  {
    icon: KeyRound,
    title: "Client token control",
    body: "Generate single-use participant URLs against purchased test quotas.",
  },
  {
    icon: ClipboardList,
    title: "Participant assessment",
    body: "Resolve a token, render the correct test dynamically, score server-side, then lock the token.",
  },
  {
    icon: Database,
    title: "Retention pipeline",
    body: "Store raw answers and scored JSON with a contract-based retention deadline.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-accent">
                TalentMap
              </p>
              <h1 className="text-3xl font-semibold tracking-normal">
                Operations Console
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/login?next=/admin"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground/75 shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:border-accent hover:text-accent"
              >
                <ShieldCheck size={16} />
                Admin
              </Link>
              <Link
                href="/login?next=/dashboard"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
              >
                Client Dashboard
                <ArrowRight size={16} />
              </Link>
            </div>
          </nav>

          <div className="grid gap-3 md:grid-cols-4">
            {systemStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
              >
                <p className="text-sm text-foreground/65">{stat.label}</p>
                <p className="mt-2 font-mono text-2xl font-semibold">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-foreground/60">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Core Workflows</h2>
              <p className="mt-1 text-sm text-foreground/65">
                The first implementation slice is organized around tenant
                isolation, token lifecycle, and dynamic test adaptation.
              </p>
            </div>
            <CheckCircle2 className="text-accent" size={22} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {workflows.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <Icon className="text-accent" size={20} />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-foreground/68">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Instrument Registry</h2>
              <p className="mt-1 text-sm text-foreground/65">
                Code-backed catalog for client entitlements in Postgres.
              </p>
            </div>
            <Link
              href="/test/demo-mbti"
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground/75 hover:border-accent hover:text-accent"
            >
              Demo MBTI
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {testCatalog.map((test) => (
              <div
                key={test.key}
                className="grid grid-cols-[1fr_auto] gap-4 py-3"
              >
                <div>
                  <p className="font-medium">{test.name}</p>
                  <p className="mt-1 text-xs text-foreground/60">
                    {test.version} / {test.estimatedMinutes} min
                  </p>
                </div>
                <span
                  className={`h-7 rounded-full px-2.5 py-1 text-xs font-medium ${
                    test.implemented
                      ? "bg-accent-muted text-accent"
                      : "bg-surface-muted text-foreground/65"
                  }`}
                >
                  {test.implemented ? "Adapted" : "Reserved"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

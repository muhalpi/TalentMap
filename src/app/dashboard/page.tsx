import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, KeyRound, ListChecks, UsersRound } from "lucide-react";

import { requireClientSession } from "@/auth/guards";
import { ResultTable } from "@/components/dashboard/result-table";
import { TokenTable } from "@/components/dashboard/token-table";
import { formatDate } from "@/components/dashboard/status";
import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";
import { getClientDashboardByClientId } from "@/services/dashboard-service";

export default async function DashboardPage() {
  const session = await requireClientSession();
  const dashboard = await getClientDashboardByClientId(session.clientId);

  if (!dashboard) {
    notFound();
  }

  return (
    <div>
      <header className="border-b border-border pb-5">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">
          Client workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          {dashboard.client.name}
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          Result data is retained through{" "}
          {formatDate(dashboard.client.contractEndsAt)}, then enters a{" "}
          {RETENTION_DELETE_GRACE_DAYS} day grace period before anonymization.
        </p>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Unlocked tests</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {dashboard.stats.testsUnlocked}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Quota allocated</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {dashboard.stats.quotaUsed}/{dashboard.stats.quotaTotal}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Active tokens</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {dashboard.stats.activeTokens}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Completed</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {dashboard.stats.completedTokens}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
        <aside className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quota</h2>
            <KeyRound className="text-accent" size={20} />
          </div>
          <div className="mt-4 space-y-4">
            {dashboard.quotas.map((row) => {
              const percent = row.quotaTotal
                ? (row.quotaUsed / row.quotaTotal) * 100
                : 0;

              return (
                <div key={row.testId} className="border-t border-border pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{row.testName}</p>
                    <p className="font-mono text-sm">{row.quotaAvailable}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-sm bg-surface-muted">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-foreground/60">
                    {row.quotaReserved} reserved / {row.quotaConsumed}{" "}
                    consumed / expires {formatDate(row.quotaExpiresAt)}
                  </p>
                </div>
              );
            })}
          </div>
          <Link
            href="/dashboard/tokens"
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
          >
            Generate tokens
            <ArrowRight size={15} />
          </Link>
        </aside>

        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recent Tokens</h2>
                <p className="mt-1 text-sm text-foreground/60">
                  Latest participant links and lifecycle state.
                </p>
              </div>
              <ListChecks className="text-accent" size={20} />
            </div>
            <TokenTable tokens={dashboard.recentTokens.slice(0, 4)} />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Recent Results</h2>
                <p className="mt-1 text-sm text-foreground/60">
                  Submitted assessments and contract retention deadlines.
                </p>
              </div>
              <UsersRound className="text-accent" size={20} />
            </div>
            <ResultTable results={dashboard.recentResults.slice(0, 4)} />
          </section>
        </div>
      </section>
    </div>
  );
}

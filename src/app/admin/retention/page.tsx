import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { RetentionSweepPanel } from "@/components/admin/retention-sweep-panel";
import {
  getRetentionOverview,
  RETENTION_DELETE_GRACE_DAYS,
} from "@/services/retention-service";

export default async function AdminRetentionPage() {
  const overview = await getRetentionOverview();

  return (
    <div>
      <header className="border-b border-border pb-5">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">
          Governance
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Retention
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
          Result data is retained through each client contract end date. Due
          results are flagged first, then anonymized after a{" "}
          {RETENTION_DELETE_GRACE_DAYS} day grace window unless the contract is
          renewed.
        </p>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Total results</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.totalResults}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Active</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.activeResults}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Due now</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-warning">
            {overview.stats.dueNowResults}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Flagged</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.flaggedResults}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Deleted</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.deletedResults}
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <h2 className="text-lg font-semibold">Internal Job Endpoint</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/60">
            Vercel Cron runs this daily at 00:00 Jakarta time. Set
            <span className="font-mono"> CRON_SECRET</span> in Vercel so cron
            requests include the matching bearer token.
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground/60">
            Manual runs can use GET or POST with an Authorization bearer token
            matching <span className="font-mono">RETENTION_JOB_SECRET</span> or
            <span className="font-mono"> CRON_SECRET</span>.
          </p>
          <p className="mt-4 break-all rounded-lg border border-border bg-background p-3 font-mono text-sm text-foreground/70">
            GET /api/internal/retention/run
          </p>
        </div>
        <RetentionSweepPanel />
      </section>

      <section className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.1fr_0.75fr_0.75fr_0.7fr_0.7fr_0.7fr_0.8fr] border-b border-border bg-surface-muted px-4 py-3 text-xs font-medium uppercase tracking-wide text-foreground/55">
            <span>Client</span>
            <span>Contract Ends</span>
            <span>Grace Ends</span>
            <span>Due Now</span>
            <span>Flagged</span>
            <span>Deleted</span>
            <span>Next Due</span>
          </div>
          {overview.clients.map((client) => (
            <div
              key={client.clientId}
              className="grid grid-cols-[1.1fr_0.75fr_0.75fr_0.7fr_0.7fr_0.7fr_0.8fr] items-center border-b border-border px-4 py-4 last:border-b-0"
            >
              <div>
                <Link
                  href={`/admin/clients/${client.clientId}`}
                  className="font-medium hover:text-accent"
                >
                  {client.name}
                </Link>
                <p className="mt-1 font-mono text-xs text-foreground/55">
                  {client.slug}
                </p>
              </div>
              <span className="font-mono text-sm text-foreground/65">
                {client.contractEndsAt.slice(0, 10)}
              </span>
              <span className="font-mono text-sm text-foreground/65">
                {client.graceEndsAt.slice(0, 10)}
              </span>
              <span className="font-mono text-sm">
                {client.dueNowResults}
              </span>
              <span className="font-mono text-sm">
                {client.flaggedResults}
              </span>
              <span className="font-mono text-sm">
                {client.deletedResults}
              </span>
              <span className="inline-flex items-center gap-2 text-sm text-foreground/65">
                <CalendarClock size={15} className="text-warning" />
                {client.nextRetentionAt
                  ? client.nextRetentionAt.slice(0, 10)
                  : "No active due date"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

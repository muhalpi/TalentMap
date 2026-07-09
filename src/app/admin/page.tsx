import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, ClipboardList } from "lucide-react";

import { getAdminProvisioningOverview } from "@/services/dashboard-service";

export default async function AdminPage() {
  const overview = await getAdminProvisioningOverview();

  return (
    <div>
      <header className="border-b border-border pb-5">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">
          Internal admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Provisioning Overview
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
          Provision clients, unlock instruments, assign quota, and track
          contract retention from one operating surface.
        </p>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Clients</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.totalClients}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Active</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.activeClients}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Unlocked tests</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.testsUnlocked}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
          <p className="text-sm text-foreground/60">Quota allocated</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {overview.stats.quotaAllocated}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/clients"
          className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:border-accent"
        >
          <Building2 className="text-accent" size={22} />
          <h2 className="mt-5 text-lg font-semibold">Clients</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/65">
            Review tenant status, contract dates, quota, and retention
            schedule.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
            Open clients <ArrowRight size={15} />
          </span>
        </Link>

        <Link
          href="/admin/instruments"
          className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:border-accent"
        >
          <ClipboardList className="text-accent" size={22} />
          <h2 className="mt-5 text-lg font-semibold">Instruments</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/65">
            Track adapted tests and which instruments are ready to sell.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
            Open registry <ArrowRight size={15} />
          </span>
        </Link>

        <Link
          href="/admin/retention"
          className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)] hover:border-accent"
        >
          <CalendarClock className="text-warning" size={22} />
          <h2 className="mt-5 text-lg font-semibold">Retention</h2>
          <p className="mt-2 text-sm leading-6 text-foreground/65">
            Prepare contract expiry and data cleanup enforcement.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
            Open retention <ArrowRight size={15} />
          </span>
        </Link>
      </section>
    </div>
  );
}

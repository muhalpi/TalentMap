import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { requireClientSession } from "@/auth/guards";
import { ResultTable } from "@/components/dashboard/result-table";
import {
  getClientDashboardByClientId,
  getClientResults,
} from "@/services/dashboard-service";

export default async function DashboardResultsPage() {
  const session = await requireClientSession();
  const [dashboard, results] = await Promise.all([
    getClientDashboardByClientId(session.clientId),
    getClientResults(session.clientId),
  ]);

  if (!dashboard) {
    notFound();
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            Results
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Assessment Results
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
            {results.length} completed assessment
            {results.length === 1 ? "" : "s"} scoped to {dashboard.client.name}.
          </p>
        </div>
        <a
          href="/api/dashboard/results/export"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
        >
          <Download size={16} />
          Export CSV
        </a>
      </header>

      <section className="mt-6">
        <ResultTable results={results} />
      </section>
    </div>
  );
}

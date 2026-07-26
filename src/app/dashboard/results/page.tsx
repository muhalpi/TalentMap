import { notFound } from "next/navigation";
import { Download } from "lucide-react";

import { requireClientSession } from "@/auth/guards";
import { ResultTable } from "@/components/dashboard/result-table";
import { SpreadsheetImportPanel } from "@/components/dashboard/spreadsheet-import-panel";
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
          Export XLSX
        </a>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
        <SpreadsheetImportPanel
          title="Import Test Results"
          description="Upload raw BFI or MBTI responses in bulk by participant ID. TalentMap calculates the result and analysis."
          endpoint="/api/dashboard/import/results"
          templateLinks={[
            {
              href: "/api/dashboard/import/templates/results",
              label: "Download Template",
            },
          ]}
        />
        <ResultTable results={results} />
      </section>
    </div>
  );
}

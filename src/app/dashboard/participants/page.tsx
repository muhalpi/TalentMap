import { notFound } from "next/navigation";
import { UserPlus, UsersRound } from "lucide-react";

import { requireClientSession } from "@/auth/guards";
import { ParticipantCreateForm } from "@/components/dashboard/participant-create-form";
import { ParticipantDirectoryControls } from "@/components/dashboard/participant-directory-controls";
import { ParticipantFieldManager } from "@/components/dashboard/participant-field-manager";
import { ParticipantTable } from "@/components/dashboard/participant-table";
import { SpreadsheetImportPanel } from "@/components/dashboard/spreadsheet-import-panel";
import { parseParticipantDirectoryQuery } from "@/lib/participant-directory-query";
import { getClientDashboardByClientId } from "@/services/dashboard-service";
import { getClientParticipantDirectory } from "@/services/participant-directory-service";
import { getClientParticipantFieldDefinitions } from "@/services/participant-field-service";

export default async function DashboardParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireClientSession();
  const query = parseParticipantDirectoryQuery(await searchParams);
  const [dashboard, directory, fieldDefinitions] = await Promise.all([
    getClientDashboardByClientId(session.clientId),
    getClientParticipantDirectory(session.clientId, query),
    getClientParticipantFieldDefinitions(session.clientId, {
      includeInactive: true,
    }),
  ]);

  if (!dashboard) {
    notFound();
  }

  const hasFilters = Boolean(
    directory.query.search ||
    directory.query.status !== "all" ||
    directory.query.activity !== "all" ||
    directory.query.sort !== "recent",
  );
  const activeFieldDefinitions = fieldDefinitions.filter(
    (field) => field.isActive,
  );

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            Talent directory
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Participants
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
            {directory.totalProfiles} profile
            {directory.totalProfiles === 1 ? "" : "s"} scoped to{" "}
            {dashboard.client.name}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
            <div className="flex items-center gap-2">
              <UsersRound className="text-accent" size={16} />
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
                Profiles
              </p>
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold">
              {directory.totalProfiles}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
            <div className="flex items-center gap-2">
              <UserPlus className="text-accent" size={16} />
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
                Complete
              </p>
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold">
              {directory.completedAssessments}/{directory.assignedAssessments}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-5 2xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <ParticipantCreateForm definitions={activeFieldDefinitions} />
          <SpreadsheetImportPanel
            title="Import Participants"
            description="Create multiple participant profiles from a structured workbook."
            endpoint="/api/dashboard/import/participants"
            templateLinks={[
              {
                href: "/api/dashboard/import/templates/participants",
                label: "Download Template",
              },
            ]}
          />
        </div>
        <div className="min-w-0">
          <h2 className="mb-3 text-lg font-semibold">Directory</h2>
          <ParticipantDirectoryControls directory={directory} />
          <ParticipantTable
            participants={directory.participants}
            emptyMessage={
              hasFilters
                ? "No participants match the current search and filters."
                : "No participant profiles yet."
            }
          />
        </div>
      </section>

      <div className="mt-6">
        <ParticipantFieldManager definitions={fieldDefinitions} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireClientSession } from "@/auth/guards";
import { ParticipantAnonymizeForm } from "@/components/dashboard/participant-anonymize-form";
import { ParticipantEditForm } from "@/components/dashboard/participant-edit-form";
import { ParticipantHistoryTable } from "@/components/dashboard/participant-history-table";
import { SpreadsheetImportPanel } from "@/components/dashboard/spreadsheet-import-panel";
import { formatDate } from "@/components/dashboard/status";
import { getClientParticipantDetail } from "@/services/participant-directory-service";
import { getClientParticipantFieldDefinitions } from "@/services/participant-field-service";
import { participantResultTemplateLinks } from "@/services/result-import-tests";

function statusClass(status: string) {
  if (status === "archived") {
    return "bg-warning/15 text-warning";
  }

  return "bg-accent-muted text-accent";
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-foreground/50">{detail}</p>
    </div>
  );
}

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const session = await requireClientSession();
  const { participantId } = await params;
  const [participant, fieldDefinitions] = await Promise.all([
    getClientParticipantDetail(session.clientId, participantId),
    getClientParticipantFieldDefinitions(session.clientId),
  ]);

  if (!participant) {
    notFound();
  }

  return (
    <div>
      <header className="border-b border-border pb-5">
        <Link
          href="/dashboard/participants"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-accent"
        >
          <ArrowLeft size={15} />
          Participants
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wide text-accent">
              Participant profile
            </p>
            <h1 className="mt-2 break-words text-3xl font-semibold tracking-normal">
              {participant.name}
            </h1>
            <p className="mt-2 max-w-3xl break-all font-mono text-sm text-foreground/55">
              {participant.employeeId ??
                participant.email ??
                participant.externalReference ??
                participant.id}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${statusClass(
              participant.status,
            )}`}
          >
            {participant.status}
          </span>
        </div>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <StatCard
          label="Assigned"
          value={participant.tokenCount}
          detail="Assessment access records linked"
        />
        <StatCard
          label="Completed"
          value={participant.completedAssessmentCount}
          detail="Retained results"
        />
        <StatCard
          label="Latest activity"
          value={
            participant.latestActivityAt
              ? formatDate(participant.latestActivityAt)
              : "-"
          }
          detail={`Created ${formatDate(participant.createdAt)}`}
        />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <ParticipantEditForm
            participant={participant}
            definitions={fieldDefinitions}
          />
          <SpreadsheetImportPanel
            title="Import Test Result"
            description="Upload raw responses for this participant. TalentMap will score and analyze them."
            endpoint="/api/dashboard/import/results"
            participantId={participant.id}
            // One button per importable instrument, derived from the same list the
            // template route validates against, so a new instrument cannot ship
            // with a working endpoint and no way to reach it.
            templateLinks={participantResultTemplateLinks(participant.id)}
          />
          <ParticipantAnonymizeForm participantId={participant.id} />
        </div>

        <div className="min-w-0">
          <h2 className="mb-3 text-lg font-semibold">Assessment History</h2>
          <ParticipantHistoryTable history={participant.assessmentHistory} />
        </div>
      </section>
    </div>
  );
}

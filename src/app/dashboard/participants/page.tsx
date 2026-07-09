import { notFound } from "next/navigation";
import { UserPlus, UsersRound } from "lucide-react";

import { requireClientSession } from "@/auth/guards";
import { ParticipantCreateForm } from "@/components/dashboard/participant-create-form";
import { ParticipantTable } from "@/components/dashboard/participant-table";
import {
  getClientDashboardByClientId,
} from "@/services/dashboard-service";
import { getClientParticipants } from "@/services/participant-directory-service";

export default async function DashboardParticipantsPage() {
  const session = await requireClientSession();
  const [dashboard, participants] = await Promise.all([
    getClientDashboardByClientId(session.clientId),
    getClientParticipants(session.clientId),
  ]);

  if (!dashboard) {
    notFound();
  }

  const completed = participants.reduce(
    (sum, participant) => sum + participant.completedAssessmentCount,
    0,
  );
  const assigned = participants.reduce(
    (sum, participant) => sum + participant.tokenCount,
    0,
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
            {participants.length} profile
            {participants.length === 1 ? "" : "s"} scoped to{" "}
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
              {participants.length}
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
              {completed}/{assigned}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <ParticipantCreateForm />
        <div className="min-w-0">
          <h2 className="mb-3 text-lg font-semibold">Directory</h2>
          <ParticipantTable participants={participants} />
        </div>
      </section>
    </div>
  );
}

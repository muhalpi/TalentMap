import { notFound } from "next/navigation";

import { requireClientSession } from "@/auth/guards";
import { GenerateTokenPanel } from "@/components/dashboard/generate-token-panel";
import { TokenTable } from "@/components/dashboard/token-table";
import { getClientDashboardByClientId } from "@/services/dashboard-service";
import { getClientParticipants } from "@/services/participant-directory-service";

export default async function DashboardTokensPage() {
  const session = await requireClientSession();
  const [dashboard, participants] = await Promise.all([
    getClientDashboardByClientId(session.clientId),
    getClientParticipants(session.clientId),
  ]);

  if (!dashboard) {
    notFound();
  }

  return (
    <div>
      <header className="border-b border-border pb-5">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">
          Token operations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Participant Tokens
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
          Generate single-use assessment links and monitor whether participants
          have started or completed them.
        </p>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <GenerateTokenPanel
          participants={participants
            .filter((participant) => participant.status === "active")
            .map((participant) => ({
              id: participant.id,
              name: participant.name,
              email: participant.email,
              employeeId: participant.employeeId,
              externalReference: participant.externalReference,
            }))}
        />
        <div className="min-w-0">
          <h2 className="mb-3 text-lg font-semibold">Token Ledger</h2>
          <TokenTable tokens={dashboard.recentTokens} allowReissue />
        </div>
      </section>
    </div>
  );
}

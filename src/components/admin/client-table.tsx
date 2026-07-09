import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";
import type { AdminClientDto } from "@/services/dashboard-service";

function formatDate(value: string) {
  return value.slice(0, 10);
}

function statusClass(status: string) {
  if (status === "active") {
    return "bg-accent-muted text-accent";
  }

  if (status === "suspended") {
    return "bg-warning/15 text-warning";
  }

  return "bg-danger/10 text-danger";
}

export function ClientTable({ clients }: { clients: AdminClientDto[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <div className="min-w-[900px]">
        <div className="grid grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr_0.7fr_0.4fr] border-b border-border bg-surface-muted px-4 py-3 text-xs font-medium uppercase tracking-wide text-foreground/55">
          <span>Client</span>
          <span>Status</span>
          <span>Quota</span>
          <span>Contract</span>
          <span>Result Retention</span>
          <span>Open</span>
        </div>
        {clients.length ? (
          clients.map((row) => (
            <div
              key={row.clientId}
              className="grid grid-cols-[1.1fr_0.7fr_0.8fr_0.8fr_0.7fr_0.4fr] items-center border-b border-border px-4 py-4 last:border-b-0"
            >
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="mt-1 font-mono text-xs text-foreground/55">
                  {row.slug}
                </p>
              </div>
              <span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                    row.status,
                  )}`}
                >
                  {row.status}
                </span>
              </span>
              <span className="font-mono text-sm">{row.quotaLabel}</span>
              <span className="font-mono text-sm text-foreground/65">
                {formatDate(row.contractEndsAt)}
              </span>
              <span className="text-sm">
                Through contract end
                <span className="mt-1 block font-mono text-xs text-foreground/55">
                  +{RETENTION_DELETE_GRACE_DAYS} day grace
                </span>
              </span>
              <Link
                href={`/admin/clients/${row.clientId}`}
                aria-label={`Open ${row.name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-foreground/65 hover:border-accent hover:text-accent"
              >
                <ArrowRight size={15} />
              </Link>
            </div>
          ))
        ) : (
          <p className="px-4 py-8 text-sm text-foreground/60">
            No clients have been provisioned yet.
          </p>
        )}
      </div>
    </div>
  );
}

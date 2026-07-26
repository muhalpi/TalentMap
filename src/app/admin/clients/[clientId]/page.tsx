import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  ClipboardList,
  KeyRound,
} from "lucide-react";

import { requireInternalAdminSession } from "@/auth/guards";
import { ClientContractForm } from "@/components/admin/client-contract-form";
import { ClientEntitlementTable } from "@/components/admin/client-entitlement-table";
import { ResultTable } from "@/components/dashboard/result-table";
import { formatDate } from "@/components/dashboard/status";
import { RETENTION_DELETE_GRACE_DAYS } from "@/lib/retention-policy";
import { TokenTable } from "@/components/dashboard/token-table";
import { getAdminClientDetail } from "@/services/dashboard-service";

type ClientDetailTab = "contract" | "tests" | "tokens" | "results";

const tabs: {
  key: ClientDetailTab;
  label: string;
  icon: typeof CalendarClock;
}[] = [
  { key: "contract", label: "Contract", icon: CalendarClock },
  { key: "tests", label: "Tests", icon: ClipboardList },
  { key: "tokens", label: "Access", icon: KeyRound },
  { key: "results", label: "Results", icon: BarChart3 },
];

function normalizeTab(value: string | string[] | undefined): ClientDetailTab {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const match = tabs.find((tab) => tab.key === rawValue);

  return match?.key ?? "contract";
}

function clientStatusClass(status: string) {
  if (status === "active") {
    return "bg-accent-muted text-accent";
  }

  if (status === "suspended") {
    return "bg-warning/15 text-warning";
  }

  return "bg-danger/10 text-danger";
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

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        {label}
      </p>
      <p
        className={`mt-2 text-sm text-foreground/80 ${
          mono ? "break-all font-mono" : "font-medium"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function AdminClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireInternalAdminSession();

  const { clientId } = await params;
  const query = await searchParams;
  const activeTab = normalizeTab(query.tab);
  const detail = await getAdminClientDetail(clientId);

  if (!detail) {
    notFound();
  }

  const basePath = `/admin/clients/${detail.client.clientId}`;

  return (
    <div>
      <header className="border-b border-border pb-5">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-accent"
        >
          <ArrowLeft size={15} />
          Clients
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-accent">
              Client detail
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              {detail.client.name}
            </h1>
            <p className="mt-2 max-w-3xl break-all font-mono text-sm text-foreground/55">
              {detail.client.slug} / {detail.client.clientId}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${clientStatusClass(
              detail.client.status,
            )}`}
          >
            {detail.client.status}
          </span>
        </div>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-4">
        <StatCard
          label="Unlocked tests"
          value={detail.stats.testsUnlocked}
          detail={`${detail.stats.quotaTotal} total allocations`}
        />
        <StatCard
          label="Quota allocated"
          value={`${detail.stats.quotaUsed}/${detail.stats.quotaTotal}`}
          detail={`${detail.stats.quotaReserved} reserved / ${detail.stats.quotaConsumed} consumed`}
        />
        <StatCard
          label="Live access"
          value={detail.stats.activeTokens + detail.stats.inProgressTokens}
          detail={`${detail.stats.completedTokens} completed / ${detail.stats.expiredTokens} expired`}
        />
        <StatCard
          label="Results"
          value={detail.stats.resultCount}
          detail={`Contract end ${formatDate(detail.client.contractEndsAt)} / ${RETENTION_DELETE_GRACE_DAYS} day grace`}
        />
      </section>

      <nav
        aria-label="Client detail sections"
        className="mt-6 flex flex-wrap gap-2"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          const href =
            tab.key === "contract" ? basePath : `${basePath}?tab=${tab.key}`;

          return (
            <Link
              key={tab.key}
              href={href}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium ${
                isActive
                  ? "border-border bg-surface-muted text-foreground shadow-[inset_0_-2px_0_var(--accent)]"
                  : "border-border bg-surface text-foreground/70 hover:border-accent hover:text-accent"
              }`}
            >
              <Icon className={isActive ? "text-accent" : ""} size={16} />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-5">
        {activeTab === "contract" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <ClientContractForm client={detail.client} />

            <aside className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
              <h2 className="text-lg font-semibold">Audit Metadata</h2>
              <div className="mt-4">
                <DetailField label="Slug" value={detail.client.slug} mono />
                <DetailField
                  label="Client ID"
                  value={detail.client.clientId}
                  mono
                />
                <DetailField
                  label="Created"
                  value={formatDate(detail.client.createdAt)}
                  mono
                />
                <DetailField
                  label="Updated"
                  value={formatDate(detail.client.updatedAt)}
                  mono
                />
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "tests" ? (
          <ClientEntitlementTable
            clientId={detail.client.clientId}
            tests={detail.testProvisioning}
          />
        ) : null}

        {activeTab === "tokens" ? (
          <div>
            <h2 className="text-lg font-semibold">Access ledger</h2>
            <p className="mb-3 mt-1 text-sm leading-6 text-foreground/60">
              Live assignments stay pinned here even when they are older than
              the recent activity window.
            </p>
            <TokenTable
              tokens={detail.accessTokens}
              allowReissue
              allowCancel
              actionEndpointBase={`/api/admin/clients/${detail.client.clientId}/tokens`}
            />
          </div>
        ) : null}

        {activeTab === "results" ? (
          <ResultTable
            results={detail.recentResults}
            resultBasePath={`/admin/clients/${detail.client.clientId}/results`}
            exportBasePath={`/api/admin/clients/${detail.client.clientId}/results/export`}
            linkParticipantProfiles={false}
          />
        ) : null}
      </section>
    </div>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";

import { ClientTable } from "@/components/admin/client-table";
import { getAdminProvisioningOverview } from "@/services/dashboard-service";

export default async function AdminClientsPage() {
  const overview = await getAdminProvisioningOverview();

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-accent">
            Provisioning
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Clients
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
            Tenant records, quotas, contract windows, and retention settings.
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgb(0_0_0/0.08)] hover:bg-accent-strong"
        >
          <Plus size={16} />
          Create Client
        </Link>
      </header>

      <section className="mt-6">
        <ClientTable clients={overview.clients} />
      </section>
    </div>
  );
}

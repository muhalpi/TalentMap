import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { requireInternalAdminSession } from "@/auth/guards";
import { ClientCreateForm } from "@/components/admin/client-create-form";

export default async function AdminNewClientPage() {
  await requireInternalAdminSession();

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
        <div className="mt-5 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
            <Building2 className="text-accent" size={20} />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-accent">
              New tenant
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">
              Create Client
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
              Provision the organization record first, then unlock purchased
              instruments from the client detail page.
            </p>
          </div>
        </div>
      </header>

      <section className="mt-6">
        <ClientCreateForm />
      </section>
    </div>
  );
}

import { CheckCircle2, CircleDashed } from "lucide-react";

import { testCatalog } from "@/tests/registry";

export default function AdminInstrumentsPage() {
  return (
    <div>
      <header className="border-b border-border pb-5">
        <p className="font-mono text-xs uppercase tracking-wide text-accent">
          Registry
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Instruments
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
          Code-backed instrument registry. Admin provisioning should only unlock
          tests marked as adapted.
        </p>
      </header>

      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {testCatalog.map((test) => {
          const Icon = test.implemented ? CheckCircle2 : CircleDashed;

          return (
            <article
              key={test.key}
              className="rounded-xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.03)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-foreground/55">
                    {test.key}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{test.name}</h2>
                </div>
                <Icon
                  className={test.implemented ? "text-accent" : "text-foreground/35"}
                  size={22}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/65">
                {test.description}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="font-mono text-foreground/60">
                  {test.version}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    test.implemented
                      ? "bg-accent-muted text-accent"
                      : "bg-surface-muted text-foreground/65"
                  }`}
                >
                  {test.implemented ? "Adapted" : "Pending"}
                </span>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

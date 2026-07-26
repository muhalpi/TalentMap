import { CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";

type ExperienceStatus = "consent" | "in_progress" | "completed";

interface ParticipantExperienceShellProps {
  organizationName: string;
  testName: string;
  status: ExperienceStatus;
  metaLabel?: string;
  children: React.ReactNode;
}

const statusConfig = {
  consent: {
    label: "Consent",
    eyebrow: "Assessment to review",
    icon: ShieldCheck,
    className: "border-blue-200 bg-blue-50 text-blue-700",
    accentClassName: "bg-blue-600",
  },
  in_progress: {
    label: "In progress",
    eyebrow: "Current assessment",
    icon: Clock3,
    className: "border-orange-200 bg-orange-50 text-orange-700",
    accentClassName: "bg-orange-500",
  },
  completed: {
    label: "Completed",
    eyebrow: "Completed assessment",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    accentClassName: "bg-emerald-500",
  },
} satisfies Record<
  ExperienceStatus,
  {
    label: string;
    eyebrow: string;
    icon: typeof ShieldCheck;
    className: string;
    accentClassName: string;
  }
>;

export function ParticipantExperienceShell({
  organizationName,
  testName,
  status,
  metaLabel,
  children,
}: ParticipantExperienceShellProps) {
  const statusItem = statusConfig[status];
  const StatusIcon = statusItem.icon;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fc] text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.09),transparent_62%)]"
      />

      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-[0_1px_10px_rgb(15_23_42/0.035)] backdrop-blur-xl">
        <div className="mx-auto grid min-h-[5.25rem] max-w-[1440px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-[0_7px_18px_rgb(15_23_42/0.16)] sm:size-11">
              <Sparkles aria-hidden="true" size={19} strokeWidth={2.2} />
              <span
                aria-hidden="true"
                className={`absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-white ${statusItem.accentClassName}`}
              />
            </span>
            <div className="min-w-0">
              <p
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px] ${
                  status === "in_progress"
                    ? "text-orange-700"
                    : status === "completed"
                      ? "text-emerald-700"
                      : "text-blue-700"
                }`}
              >
                <StatusIcon aria-hidden="true" size={13} strokeWidth={2.4} />
                {statusItem.eyebrow}
              </p>
              <p className="mt-0.5 break-words text-base font-semibold leading-5 tracking-[-0.02em] text-slate-950 sm:text-lg sm:leading-6">
                {testName}
              </p>
              <p className="mt-0.5 break-words text-xs leading-4 text-slate-600">
                Issued by{" "}
                <span className="font-semibold">{organizationName}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            {metaLabel ? (
              <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold tabular-nums text-slate-700 shadow-sm sm:px-3 sm:text-sm">
                {status === "in_progress" ? <Clock3 size={16} /> : null}
                {metaLabel}
              </span>
            ) : null}
            <span
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold sm:min-h-9 sm:px-3 sm:text-sm ${statusItem.className}`}
            >
              <StatusIcon aria-hidden="true" size={15} />
              <span>{statusItem.label}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="relative mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        {children}
      </div>
    </main>
  );
}

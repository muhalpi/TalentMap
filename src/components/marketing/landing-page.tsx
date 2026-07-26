import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  KeyRound,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  Workflow,
} from "lucide-react";

import { testCatalog } from "@/tests/registry";
import { MobileNavigation } from "@/components/marketing/mobile-navigation";

const availableTests = testCatalog.filter((test) => test.implemented);

const capabilities = [
  {
    icon: UsersRound,
    title: "Participant management",
    body: "Organize talent profiles and assessment history inside the correct organization workspace.",
    detail: "Tenant-scoped directory",
  },
  {
    icon: KeyRound,
    title: "Controlled assessment access",
    body: "Issue participant-specific access codes, rotate them when needed, and keep credentials out of shared links.",
    detail: "No participant account required",
  },
  {
    icon: ClipboardCheck,
    title: "Consent-first delivery",
    body: "Present the assessment purpose, data use, and retention terms before an assignment begins.",
    detail: "Clear participant journey",
  },
  {
    icon: BarChart3,
    title: "Scoring and interpretation",
    body: "Score submissions on the server and turn structured results into readable profiles and work-style insights.",
    detail: "Consistent output",
  },
];

const journey = [
  {
    number: "01",
    title: "Set up the workspace",
    body: "TalentMap provisions the organization, assessment entitlements, contract window, and quota.",
  },
  {
    number: "02",
    title: "Invite a participant",
    body: "A tenant user creates an assignment for an existing participant and shares a one-time access code.",
  },
  {
    number: "03",
    title: "Complete with consent",
    body: "The participant reviews the privacy notice, completes the assessment, and can safely resume a draft.",
  },
  {
    number: "04",
    title: "Review the result",
    body: "The workspace receives a scored profile while retention stays aligned with the organization contract.",
  },
];

const safeguards = [
  {
    icon: Building2,
    title: "Tenant-separated workspaces",
    body: "Participant, assignment, consent, result, and quota records stay scoped to their organization.",
  },
  {
    icon: LockKeyhole,
    title: "Hash-only access codes",
    body: "Raw participant access codes are returned only when created or rotated, then stored as secure hashes.",
  },
  {
    icon: FileCheck2,
    title: "Explicit consent record",
    body: "Every accepted consent captures a versioned snapshot before the assessment can start.",
  },
  {
    icon: Database,
    title: "Contract-aligned retention",
    body: "Result availability follows the tenant contract window and a controlled deletion workflow.",
  },
];

const assessmentLabels: Record<string, string> = {
  mbti: "Personality type",
  bfi: "Work-style dimensions",
};

function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-[10px] bg-blue-600 text-white shadow-[0_8px_20px_rgb(37_99_235/0.24)]">
        <Sparkles aria-hidden="true" size={18} strokeWidth={2.2} />
      </span>
      <span className="leading-none">
        <span className="block text-[19px] font-semibold tracking-[-0.035em] text-slate-950">
          TalentMap
        </span>
        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Assessment platform
        </span>
      </span>
    </span>
  );
}

function ProductPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-[680px]"
      aria-label="Illustration of the TalentMap assessment operations workspace"
      role="img"
    >
      <div className="absolute -left-8 top-12 hidden size-28 rounded-full border border-blue-200/60 bg-blue-100/50 blur-2xl sm:block" />
      <div className="absolute -right-6 -top-7 size-40 rounded-full border border-cyan-200/50 bg-cyan-100/50 blur-3xl" />

      <div className="relative overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_28px_70px_rgb(15_23_42/0.14)]">
        <div className="flex h-11 items-center justify-between border-b border-slate-200/80 px-4 sm:px-5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2 rounded-full bg-slate-300" />
            <span className="size-2 rounded-full bg-slate-300" />
            <span className="size-2 rounded-full bg-blue-500" />
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Secure workspace
          </span>
        </div>

        <div className="grid grid-cols-[46px_minmax(0,1fr)] sm:grid-cols-[64px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-4 bg-[#061a38] py-4 text-blue-100">
            <span className="grid size-7 place-items-center rounded-lg bg-blue-600 sm:size-8">
              <Sparkles aria-hidden="true" size={14} />
            </span>
            {[Layers3, UsersRound, ClipboardCheck, BarChart3].map((Icon, index) => (
              <span
                key={index}
                className={`grid size-7 place-items-center rounded-md ${
                  index === 0 ? "bg-blue-500/25 text-blue-200" : "text-blue-100/45"
                }`}
              >
                <Icon aria-hidden="true" size={13} />
              </span>
            ))}
          </div>

          <div className="min-w-0 bg-[#f7f9fc] p-3 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-blue-600">
                  Workspace overview
                </p>
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-slate-900 sm:text-base">
                  Assessment operations
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-medium text-slate-500 shadow-sm sm:flex">
                <Building2 aria-hidden="true" size={12} />
                Organization workspace
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-3">
                <div className="flex items-center gap-1.5 text-[8px] font-medium text-slate-500 sm:text-[9px]">
                  <BrainCircuit aria-hidden="true" className="text-blue-500" size={12} />
                  Available
                </div>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950 sm:text-xl">
                  {availableTests.length}
                </p>
                <p className="mt-0.5 text-[8px] text-slate-400 sm:text-[9px]">assessments</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-3">
                <div className="flex items-center gap-1.5 text-[8px] font-medium text-slate-500 sm:text-[9px]">
                  <Workflow aria-hidden="true" className="text-orange-500" size={12} />
                  Lifecycle
                </div>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950 sm:text-xl">4</p>
                <p className="mt-0.5 text-[8px] text-slate-400 sm:text-[9px]">access states</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-3">
                <div className="flex items-center gap-1.5 text-[8px] font-medium text-slate-500 sm:text-[9px]">
                  <ShieldCheck aria-hidden="true" className="text-emerald-500" size={12} />
                  Data scope
                </div>
                <p className="mt-2 truncate text-[13px] font-semibold tracking-[-0.025em] text-slate-950 sm:text-sm">
                  Tenant only
                </p>
                <p className="mt-1 text-[8px] text-slate-400 sm:text-[9px]">every record</p>
              </div>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[1.18fr_0.82fr]">
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold text-slate-800">Participant journey</p>
                  <span className="text-[8px] font-medium text-slate-400">Controlled end to end</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-1">
                  {["Access", "Consent", "Assess", "Result"].map((label, index) => (
                    <div key={label} className="relative text-center">
                      {index < 3 ? (
                        <span className="absolute left-[58%] top-[11px] h-px w-[84%] bg-blue-200" />
                      ) : null}
                      <span
                        className={`relative mx-auto grid size-[23px] place-items-center rounded-full border text-[8px] font-semibold ${
                          index < 2
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-blue-200 bg-blue-50 text-blue-600"
                        }`}
                      >
                        {index < 2 ? <Check aria-hidden="true" size={11} /> : index + 1}
                      </span>
                      <p className="mt-1.5 text-[8px] font-medium text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-[9px] leading-4 text-blue-900">
                  Participant access is separate from organization account access.
                </div>
              </div>

              <div className="hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:block">
                <p className="text-[10px] font-semibold text-slate-800">Workspace safeguards</p>
                <div className="mt-3 space-y-2.5">
                  {["Server-side scoring", "Consent record", "Code rotation"].map((label) => (
                    <div key={label} className="flex items-center gap-2 text-[9px] text-slate-500">
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check aria-hidden="true" size={9} strokeWidth={2.5} />
                      </span>
                      {label}
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-4/5 rounded-full bg-blue-500" />
                </div>
                <p className="mt-2 text-[8px] leading-3 text-slate-400">Contract-bound data lifecycle</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 left-5 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_35px_rgb(15_23_42/0.13)] sm:flex">
        <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
          <CheckCircle2 aria-hidden="true" size={17} />
        </span>
        <span>
          <span className="block text-[10px] font-semibold text-slate-800">Ready for review</span>
          <span className="mt-0.5 block text-[9px] text-slate-400">Structured result profile</span>
        </span>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:translate-y-0"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="TalentMap home">
            <Brand />
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-8 lg:flex">
            <Link className="text-sm font-medium text-slate-600 hover:text-blue-600" href="/#platform">
              Platform
            </Link>
            <Link className="text-sm font-medium text-slate-600 hover:text-blue-600" href="/#how-it-works">
              How it works
            </Link>
            <Link className="text-sm font-medium text-slate-600 hover:text-blue-600" href="/#assessments">
              Assessments
            </Link>
            <Link className="text-sm font-medium text-slate-600 hover:text-blue-600" href="/#security">
              Security
            </Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/test"
              className="inline-flex h-10 items-center justify-center px-3 text-sm font-semibold text-slate-600 hover:text-blue-600"
            >
              Participant access
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#061a38] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgb(6_26_56/0.18)] hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Tenant &amp; admin access
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>

          <MobileNavigation />
        </div>
      </header>

      <main id="main-content">
        <section className="relative isolate overflow-hidden border-b border-slate-200/70 bg-[#f7f9fc]">
          <div
            className="absolute inset-0 -z-10 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 76% 18%, rgba(37,99,235,0.13), transparent 28%), linear-gradient(rgba(226,232,240,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,0.45) 1px, transparent 1px)",
              backgroundSize: "auto, 32px 32px, 32px 32px",
              maskImage: "linear-gradient(to bottom, black, transparent 88%)",
            }}
          />
          <div className="mx-auto grid max-w-[1440px] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.87fr_1.13fr] lg:px-12 lg:py-24 xl:gap-20 xl:py-28">
            <div className="dashboard-reveal relative z-10 max-w-[610px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.11em] text-blue-700">
                <ShieldCheck aria-hidden="true" size={14} />
                Psychometric assessment operations
              </div>
              <h1 className="mt-6 text-[42px] font-semibold leading-[1.02] tracking-[-0.055em] text-[#061a38] sm:text-[56px] lg:text-[64px]">
                Understand talent.
                <span className="mt-1 block text-blue-600">Support better decisions.</span>
              </h1>
              <p className="mt-6 max-w-[580px] text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                TalentMap helps organizations deliver structured personality and work-style assessments—from participant access and consent to scoring, results, and retention—in one secure workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#platform"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgb(37_99_235/0.24)] hover:-translate-y-0.5 hover:bg-blue-700"
                >
                  Explore the platform
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
                <Link
                  href="/test"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700"
                >
                  Enter an assessment
                </Link>
              </div>
              <div className="mt-7 flex items-start gap-2.5 text-xs leading-5 text-slate-500">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" size={15} />
                <p>
                  Closed B2B access: organization accounts are provisioned by TalentMap. There is no public sign-up.
                </p>
              </div>
            </div>

            <div className="dashboard-reveal [animation-delay:120ms]">
              <ProductPreview />
            </div>
          </div>

          <div className="mx-auto grid max-w-[1440px] grid-cols-2 border-t border-slate-200/80 bg-white/75 px-5 sm:px-8 md:grid-cols-4 lg:px-12">
            {[
              [ShieldCheck, "Private tenant workspaces"],
              [BrainCircuit, "Server-side scoring"],
              [UserRoundCheck, "Consent before assessment"],
              [Database, "Contract-aligned retention"],
            ].map(([Icon, label], index) => {
              const TrustIcon = Icon as typeof ShieldCheck;
              return (
                <div
                  key={label as string}
                  className={`flex min-h-24 items-center gap-3 px-2 py-5 sm:px-5 ${
                    index % 2 === 0 ? "border-r border-slate-200/80" : ""
                  } ${index > 1 ? "border-t border-slate-200/80 md:border-t-0" : ""} ${
                    index === 1 ? "md:border-r" : ""
                  }`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                    <TrustIcon aria-hidden="true" size={17} />
                  </span>
                  <span className="text-[12px] font-semibold leading-5 text-slate-700 sm:text-[13px]">
                    {label as string}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 bg-white py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">One operating layer</p>
                <h2 className="mt-3 max-w-lg text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#061a38] sm:text-4xl">
                  From invitation to insight, without losing control.
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end">
                TalentMap connects the practical work around an assessment—not only the questionnaire—so teams can manage access, privacy, progress, results, and the data lifecycle with one clear process.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((capability, index) => {
                const Icon = capability.icon;
                return (
                  <article
                    key={capability.title}
                    className="group relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f9fc] p-6 shadow-[0_3px_12px_rgb(15_23_42/0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_34px_rgb(15_23_42/0.08)]"
                  >
                    <span className="absolute right-5 top-4 font-mono text-[11px] text-slate-300">0{index + 1}</span>
                    <span className="grid size-11 place-items-center rounded-xl border border-blue-100 bg-white text-blue-600 shadow-sm">
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <h3 className="mt-8 text-lg font-semibold tracking-[-0.025em] text-slate-900">{capability.title}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">{capability.body}</p>
                    <p className="mt-auto flex items-center gap-2 pt-8 text-[11px] font-semibold uppercase tracking-[0.09em] text-blue-600">
                      <span className="h-px w-5 bg-blue-400" />
                      {capability.detail}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-[#061a38] py-20 text-white sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">How it works</p>
                <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
                  A deliberate journey for every role.
                </h2>
                <p className="mt-5 max-w-md text-sm leading-7 text-blue-100/70">
                  Organization users run the workspace. Participants enter only the assessment assigned to them. Internal admins manage provisioning and platform operations.
                </p>
              </div>

              <ol className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
                {journey.map((step) => (
                  <li key={step.number} className="min-h-[220px] bg-[#0a2142] p-6 sm:p-7">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs font-semibold text-blue-300">{step.number}</span>
                      <ArrowRight aria-hidden="true" className="text-blue-300/50" size={16} />
                    </div>
                    <h3 className="mt-10 text-lg font-semibold tracking-[-0.025em]">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-blue-100/65">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="assessments" className="scroll-mt-24 bg-[#f7f9fc] py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Available assessments</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#061a38] sm:text-4xl">
                  Built around real instruments, not decorative scores.
                </h2>
                <p className="mt-5 text-base leading-7 text-slate-600">
                  Only implemented instruments are available for assignment. Additional assessments remain hidden from participant delivery until their questions, scoring, and result mapping are ready.
                </p>
                <div className="mt-7 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 aria-hidden="true" size={19} />
                  </span>
                  <p className="text-sm leading-6 text-slate-600">
                    <span className="font-semibold text-slate-900">{availableTests.length} assessments</span> currently adapted and available in the registry.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {availableTests.map((test, index) => (
                  <article
                    key={test.key}
                    className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:p-6"
                  >
                    <div
                      className={`grid size-[72px] place-items-center rounded-xl ${
                        index === 0 ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <span className="text-lg font-semibold tracking-[-0.05em]">
                        {test.key === "mbti" ? "MBTI" : "BFI"}
                      </span>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-[-0.025em] text-slate-900">{test.name}</h3>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                          Available
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {test.key === "mbti"
                          ? "A structured personality-type assessment with a clear type profile and detailed interpretation."
                          : "A work-style profile across five dimensions using a plain-English 50-item assessment."}
                      </p>
                    </div>
                    <div className="flex min-w-28 items-center gap-2 text-xs font-medium text-slate-500 sm:justify-end">
                      <BrainCircuit aria-hidden="true" className="text-blue-500" size={15} />
                      {assessmentLabels[test.key] ?? "Psychometric profile"}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="scroll-mt-24 bg-white py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
            <div className="rounded-[24px] border border-slate-200 bg-[#f7f9fc] p-6 sm:p-9 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Closed by design</p>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#061a38] sm:text-4xl">
                    Access that matches the responsibility.
                  </h2>
                </div>
                <p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end">
                  TalentMap separates organization access, internal administration, and participant assessment sessions. Each route is designed for the minimum access that role needs.
                </p>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {safeguards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgb(15_23_42/0.035)]">
                      <div className="flex items-start gap-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
                          <Icon aria-hidden="true" size={18} />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white pb-20 sm:pb-24 lg:pb-28">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
            <div className="relative isolate overflow-hidden rounded-[24px] bg-blue-600 px-6 py-12 text-white shadow-[0_22px_55px_rgb(37_99_235/0.22)] sm:px-10 sm:py-14 lg:px-14">
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 opacity-30"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 82% 28%, rgba(255,255,255,0.7), transparent 21%), linear-gradient(115deg, transparent 55%, rgba(6,26,56,0.8))",
                }}
              />
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Choose the right entry</p>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
                    Your access starts with your role.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-blue-50/85 sm:text-base">
                    Participants use an assessment code. Provisioned tenant users and internal administrators use the secure workspace portal.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Link
                    href="/test"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-blue-700 shadow-sm hover:-translate-y-0.5 hover:bg-blue-50"
                  >
                    Enter assessment code
                    <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/30 bg-[#061a38] px-5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-slate-900"
                  >
                    Open secure workspace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-[#f7f9fc]">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-10">
          <div className="max-w-sm">
            <Link href="/" aria-label="TalentMap home">
              <Brand />
            </Link>
            <p className="mt-5 text-sm leading-6 text-slate-600">
              Structured psychometric assessment operations for organizations, from participant access to responsible data retention.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-900">Explore</h2>
            <nav aria-label="Footer platform links" className="mt-4 space-y-3">
              <Link className="block text-sm text-slate-600 hover:text-blue-600" href="/#platform">Platform</Link>
              <Link className="block text-sm text-slate-600 hover:text-blue-600" href="/#how-it-works">How it works</Link>
              <Link className="block text-sm text-slate-600 hover:text-blue-600" href="/#assessments">Assessments</Link>
              <Link className="block text-sm text-slate-600 hover:text-blue-600" href="/#security">Security</Link>
            </nav>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-900">Access</h2>
            <nav aria-label="Footer access links" className="mt-4 space-y-3">
              <Link className="block text-sm text-slate-600 hover:text-blue-600" href="/test">Participant assessment</Link>
              <Link className="block text-sm text-slate-600 hover:text-blue-600" href="/login">Tenant &amp; admin portal</Link>
            </nav>
            <p className="mt-5 text-xs leading-5 text-slate-500">No public account registration.</p>
          </div>
        </div>
        <div className="border-t border-slate-200">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <p>© {new Date().getFullYear()} TalentMap. All rights reserved.</p>
            <p>Secure assessment operations for provisioned organizations.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

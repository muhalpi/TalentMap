import {
  BarChart3,
  CheckCircle2,
  Compass,
  Lightbulb,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import type {
  BfiScoreOutput,
  BfiTraitKey,
  BfiTraitScore,
} from "@/tests/instruments/bfi/types";

const traitTones: Record<
  BfiTraitKey,
  { accent: string; icon: string; surface: string }
> = {
  extraversion: {
    accent: "#2563eb",
    icon: "bg-blue-50 text-blue-700",
    surface: "border-blue-100 bg-blue-50/50",
  },
  agreeableness: {
    accent: "#16a36a",
    icon: "bg-emerald-50 text-emerald-700",
    surface: "border-emerald-100 bg-emerald-50/50",
  },
  conscientiousness: {
    accent: "#7c3aed",
    icon: "bg-violet-50 text-violet-700",
    surface: "border-violet-100 bg-violet-50/50",
  },
  emotionalStability: {
    accent: "#0891b2",
    icon: "bg-cyan-50 text-cyan-700",
    surface: "border-cyan-100 bg-cyan-50/50",
  },
  opennessIntellect: {
    accent: "#f97316",
    icon: "bg-orange-50 text-orange-700",
    surface: "border-orange-100 bg-orange-50/50",
  },
};

function bandLabel(trait: BfiTraitScore) {
  return `${trait.band[0].toUpperCase()}${trait.band.slice(1)} expression`;
}

export function BfiProfileReport({ score }: { score: BfiScoreOutput }) {
  const traits = score.result.traitProfiles;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_3px_14px_rgb(15_23_42/0.04)]">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700">
              <Sparkles size={16} />
              IPIP Big Five profile
            </span>
            <h1
              data-participant-result-heading
              tabIndex={-1}
              className="mt-5 text-[28px] font-semibold leading-tight tracking-[-0.04em] text-slate-950 focus:outline-none sm:text-[32px]"
            >
              {score.summary.label}
            </h1>
            <p className="mt-2 text-lg font-medium leading-7 text-slate-700">
              {score.result.epithet}
            </p>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              {score.result.description}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center gap-2">
              <Scale className="shrink-0 text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-slate-950">
                How to read the scores
              </h2>
            </div>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Each bar shows position on the possible response scale. It is not
              a percentile or ranking against other people.
            </p>
            <div className="mt-4 flex items-center justify-between gap-4 text-sm font-medium text-slate-600">
              <span>Lower expression</span>
              <span>Higher expression</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-7">
        <div className="flex items-center gap-2">
          <BarChart3 className="shrink-0 text-blue-600" size={20} />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Five-trait snapshot
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Ten items contribute to each independent dimension
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {traits.map((trait) => {
            const tone = traitTones[trait.key];

            return (
              <div
                key={trait.key}
                className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)_112px] sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold ${tone.icon}`}
                  >
                    {trait.code}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-6 text-slate-900">
                      {trait.label}
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-slate-600">
                      {bandLabel(trait)}
                    </p>
                  </div>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-slate-100"
                  role="img"
                  aria-label={`${trait.label}: ${trait.scorePercent} out of 100 on the response scale`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: tone.accent,
                      width: `${trait.scorePercent}%`,
                    }}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2 sm:justify-end">
                  <span className="text-2xl font-semibold tabular-nums text-slate-950">
                    {trait.scorePercent}
                  </span>
                  <span className="text-sm text-slate-600">
                    avg {trait.average.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {traits.map((trait) => {
          const tone = traitTones[trait.key];

          return (
            <article
              key={trait.key}
              className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-lg text-sm font-bold ${tone.icon}`}
                  >
                    {trait.code}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {trait.label}
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-5 text-slate-600">
                      {bandLabel(trait)} · {trait.rawScore}/{trait.maxRawScore}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-semibold tabular-nums text-slate-950">
                  {trait.scorePercent}
                </span>
              </div>

              <p className="mt-5 text-base leading-7 text-slate-700">
                {trait.workStyle}
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className={`rounded-lg border p-4 ${tone.surface}`}>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
                    <CheckCircle2 size={16} />
                    Strength
                  </div>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {trait.strength}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-amber-800">
                    <ShieldAlert size={16} />
                    Watch for
                  </div>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    {trait.watchOut}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-7">
          <div className="flex items-center gap-2">
            <Compass className="shrink-0 text-violet-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-950">
              Development prompts
            </h2>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {score.interpretation.workplaceSummary}
          </p>
          <ul className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {score.interpretation.developmentTips.map((tip) => (
              <li key={tip} className="flex gap-3 px-4 py-4">
                <Lightbulb
                  className="mt-1 shrink-0 text-amber-600"
                  size={18}
                />
                <span className="text-base leading-7 text-slate-700">
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <aside className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.04)] sm:p-7">
          <div className="flex items-center gap-2">
            <Scale className="shrink-0 text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-slate-950">
              Method and boundaries
            </h2>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {score.interpretation.methodology}
          </p>
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
            <p className="text-base leading-7 text-blue-900">
              {score.interpretation.disclaimer}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

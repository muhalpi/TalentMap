import Image from "next/image";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Compass,
  Gift,
  HeartHandshake,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { ParticipantExperienceShell } from "@/components/test/participant-experience-shell";
import { ParticipantResultCompletion } from "@/components/test/participant-result-completion";

interface MbtiDimension {
  code: string;
  selected: string;
  left: string;
  right: string;
  leftScore: number;
  rightScore: number;
}

interface MbtiResultProfile {
  type?: string;
  name?: string;
  nameDescription?: string;
  epithet?: string;
  imagePath?: string;
  description?: string;
  generalTraits?: string[];
  strengths?: string[];
}

interface MbtiInterpretation {
  relationshipStrengths?: string[];
  relationshipWeaknesses?: string[];
  successDefinition?: string;
  gifts?: string[];
  livingHappilyTips?: string;
}

interface MbtiParticipantResultProps {
  dimensions: MbtiDimension[];
  durationSeconds: number;
  interpretation?: MbtiInterpretation;
  organizationName: string;
  profile: MbtiResultProfile;
  summaryType?: string;
  testName: string;
}

const strengthTones = [
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-blue-200 bg-blue-50 text-blue-900",
  "border-emerald-200 bg-emerald-50 text-emerald-900",
  "border-violet-200 bg-violet-50 text-violet-900",
];

const preferenceDetails: Record<
  string,
  { description: string; name: string }
> = {
  E: {
    name: "Extraversion",
    description:
      "You may gain energy from interaction, activity, and engaging with the world around you.",
  },
  I: {
    name: "Introversion",
    description:
      "You may gain energy from reflection, focused time, and processing experiences internally.",
  },
  S: {
    name: "Sensing",
    description:
      "You may prefer concrete information, practical details, and what can be observed directly.",
  },
  N: {
    name: "Intuition",
    description:
      "You may prefer patterns, possibilities, and connections beyond the immediate details.",
  },
  T: {
    name: "Thinking",
    description:
      "You may weigh decisions through logic, consistency, and objective principles.",
  },
  F: {
    name: "Feeling",
    description:
      "You may weigh decisions through personal values and their effect on other people.",
  },
  J: {
    name: "Judging",
    description:
      "You may prefer structure, clear plans, and bringing decisions to a conclusion.",
  },
  P: {
    name: "Perceiving",
    description:
      "You may prefer flexibility, continued exploration, and keeping options open.",
  },
};

const narrativeAccent = {
  amber: "border-amber-300",
  blue: "border-blue-300",
  violet: "border-violet-300",
};

function toNarrativeParagraphs(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const sentences =
    typeof Intl.Segmenter === "function"
      ? Array.from(
          new Intl.Segmenter("en", { granularity: "sentence" }).segment(
            normalized,
          ),
          ({ segment }) => segment.trim(),
        ).filter(Boolean)
      : (normalized.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) ?? [normalized])
          .map((sentence) => sentence.trim())
          .filter(Boolean);
  const paragraphs: string[] = [];
  let current: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWordCount = sentence.split(/\s+/).length;

    if (
      current.length > 0 &&
      (current.length >= 3 || currentWordCount + sentenceWordCount > 78)
    ) {
      paragraphs.push(current.join(" "));
      current = [];
      currentWordCount = 0;
    }

    current.push(sentence);
    currentWordCount += sentenceWordCount;
  }

  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  return paragraphs;
}

function NarrativeText({
  accent,
  fullWidth = false,
  text,
}: {
  accent: keyof typeof narrativeAccent;
  fullWidth?: boolean;
  text: string;
}) {
  const paragraphs = toNarrativeParagraphs(text);

  return (
    <div className={`${fullWidth ? "w-full" : "max-w-[74ch]"} space-y-4`}>
      {paragraphs.map((paragraph, index) => (
        <p
          key={`${index}-${paragraph.slice(0, 32)}`}
          className={
            index === 0
              ? `border-l-4 pl-4 text-base font-medium leading-7 text-slate-800 ${narrativeAccent[accent]}`
              : "text-base leading-7 text-slate-700"
          }
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function MbtiParticipantResult({
  dimensions,
  durationSeconds,
  interpretation,
  organizationName,
  profile,
  summaryType,
  testName,
}: MbtiParticipantResultProps) {
  const primaryType = profile.type ?? summaryType;
  const profileName = profile.name ?? profile.nameDescription;
  const traits = profile.generalTraits ?? [];
  const strengths = profile.strengths ?? [];
  const relationshipStrengths = interpretation?.relationshipStrengths ?? [];
  const relationshipWeaknesses = interpretation?.relationshipWeaknesses ?? [];
  const gifts = interpretation?.gifts ?? [];

  return (
    <ParticipantExperienceShell
      organizationName={organizationName}
      testName={testName}
      status="completed"
    >
      <main className="mx-auto max-w-5xl space-y-5" aria-labelledby="result-heading">
        <ParticipantResultCompletion
          description="Your personality profile is ready to explore below."
          durationSeconds={durationSeconds}
        />

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgb(15_23_42/0.07)]">
          <div className="grid bg-slate-950 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div className="p-5 text-white sm:p-6 lg:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">
                Your personality profile
              </p>
              <h1
                id="result-heading"
                data-participant-result-heading
                tabIndex={-1}
                className="mt-3 tracking-[-0.035em] focus:outline-none"
              >
                <span className="block text-[32px] font-bold leading-tight text-white sm:text-[38px]">
                  {primaryType ?? "Your profile"}
                </span>
                {profileName ? (
                  <span className="mt-1.5 block text-xl font-semibold text-blue-100 sm:text-2xl">
                    {profileName}
                  </span>
                ) : null}
              </h1>
              {profile.epithet && profile.epithet !== profileName ? (
                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-200">
                  {profile.epithet}
                </p>
              ) : null}

              {traits.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Key profile traits">
                  {traits.slice(0, 4).map((trait) => (
                    <li
                      key={trait}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium leading-5 text-white"
                    >
                      {trait}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex min-h-52 items-center justify-center bg-gradient-to-br from-blue-50 to-violet-100 p-6 lg:min-h-full">
              <div className="grid size-44 place-items-center overflow-hidden rounded-full border-[6px] border-white bg-white shadow-lg">
                {profile.imagePath ? (
                  <Image
                    src={profile.imagePath}
                    alt={`${primaryType ?? "Personality"} profile illustration`}
                    width={176}
                    height={176}
                    className="h-full w-full object-cover"
                    sizes="176px"
                    priority
                  />
                ) : (
                  <Sparkles aria-hidden="true" className="text-blue-600" size={56} />
                )}
              </div>
            </div>
          </div>
        </section>

        {dimensions.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.045)] sm:p-6" aria-labelledby="dimensions-heading">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                <BarChart3 aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 id="dimensions-heading" className="text-lg font-semibold text-slate-950 sm:text-xl">
                  Your preference dimensions
                </h2>
                <p className="mt-1 text-base leading-7 text-slate-600">
                  Each pair shows where your answers leaned in this assessment.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3.5 md:grid-cols-2">
              {dimensions.map((dimension) => {
                const total = dimension.leftScore + dimension.rightScore || 1;
                const leftPercent = Math.round((dimension.leftScore / total) * 100);
                const rightPercent = 100 - leftPercent;
                const leftPreference = preferenceDetails[dimension.left];
                const rightPreference = preferenceDetails[dimension.right];
                const selectedPreference = preferenceDetails[dimension.selected];

                return (
                  <article
                    key={dimension.code}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-600">
                          {leftPreference?.name ?? dimension.left} /{" "}
                          {rightPreference?.name ?? dimension.right}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">
                          {selectedPreference?.name ?? dimension.selected}{" "}
                          <span className="text-blue-700">
                            ({dimension.selected})
                          </span>
                        </h3>
                      </div>
                      <span className="rounded-md bg-blue-700 px-2.5 py-1 text-sm font-bold text-white">
                        {dimension.code}
                      </span>
                    </div>

                    {selectedPreference ? (
                      <p className="mt-2 text-base leading-7 text-slate-700">
                        {selectedPreference.description}
                      </p>
                    ) : null}

                    <div
                      className="mt-4"
                      role="img"
                      aria-label={`${leftPreference?.name ?? dimension.left}: ${dimension.leftScore} of ${total}; ${rightPreference?.name ?? dimension.right}: ${dimension.rightScore} of ${total}. Selected preference: ${selectedPreference?.name ?? dimension.selected}.`}
                    >
                      <div className="flex justify-between gap-4 text-sm font-semibold text-slate-700" aria-hidden="true">
                        <span>{dimension.left} {leftPercent}%</span>
                        <span>{dimension.right} {rightPercent}%</span>
                      </div>
                      <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                        <span className="bg-blue-700" style={{ width: `${leftPercent}%` }} />
                        <span className="bg-violet-500" style={{ width: `${rightPercent}%` }} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-6" aria-label="Profile interpretation">
          {profile.description ? (
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.045)] sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8">
                <header>
                  <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-blue-700">
                    <Compass aria-hidden="true" size={20} />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-slate-950 sm:text-xl">
                    About your type
                  </h2>
                  {profile.nameDescription &&
                  profile.nameDescription !== profileName ? (
                    <p className="mt-2 text-base font-semibold leading-6 text-slate-600">
                      {profile.nameDescription}
                    </p>
                  ) : null}
                </header>
                <NarrativeText accent="blue" text={profile.description} />
              </div>
            </article>
          ) : null}

          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.045)] sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-8">
              <header>
                <span className="grid size-10 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <Lightbulb aria-hidden="true" size={20} />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-slate-950 sm:text-xl">
                  What success can look like
                </h2>
                <p className="mt-2 text-base leading-6 text-slate-600">
                  How this profile can express itself when your strengths are used well.
                </p>
              </header>
              <NarrativeText
                accent="amber"
                text={
                  interpretation?.successDefinition ??
                  "Use this profile as a starting point for reflection, growth, and better collaboration with others."
                }
              />
            </div>
          </article>
        </section>

        {strengths.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.045)] sm:p-6" aria-labelledby="strengths-heading">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 id="strengths-heading" className="text-lg font-semibold text-slate-950 sm:text-xl">
                  Strengths you can build on
                </h2>
                <p className="mt-1 text-base leading-7 text-slate-600">
                  Consider where these patterns already support your work and relationships.
                </p>
              </div>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {strengths.map((strength, index) => (
                <li
                  key={strength}
                  className={`flex items-start gap-3 rounded-lg border p-4 ${strengthTones[index % strengthTones.length]}`}
                >
                  <Check aria-hidden="true" className="mt-0.5 shrink-0" size={20} strokeWidth={2.5} />
                  <span className="text-base font-semibold leading-7">{strength}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {traits.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.045)] sm:p-6" aria-labelledby="traits-heading">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-700">
                <Sparkles aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 id="traits-heading" className="text-lg font-semibold text-slate-950 sm:text-xl">
                  Detailed profile traits
                </h2>
                <p className="mt-1 text-base leading-7 text-slate-600">
                  A fuller view of the tendencies associated with your result.
                </p>
              </div>
            </div>
            <ul className="mt-5 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {traits.map((trait) => (
                <li key={trait} className="flex items-start gap-3 border-b border-slate-100 py-3 text-base leading-7 text-slate-700">
                  <CheckCircle2 aria-hidden="true" className="mt-1 shrink-0 text-blue-700" size={19} />
                  <span>{trait}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {relationshipStrengths.length > 0 || relationshipWeaknesses.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_14px_rgb(15_23_42/0.045)] sm:p-6" aria-labelledby="relationships-heading">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-800">
                <HeartHandshake aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 id="relationships-heading" className="text-lg font-semibold text-slate-950 sm:text-xl">
                  Relationships and collaboration
                </h2>
                <p className="mt-1 text-base leading-7 text-slate-600">
                  Patterns to recognize when working and connecting with other people.
                </p>
              </div>
            </div>

            <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
              {relationshipStrengths.length > 0 ? (
                <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-950">
                    <CheckCircle2 aria-hidden="true" size={21} />
                    What you bring
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {relationshipStrengths.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-base leading-7 text-emerald-950">
                        <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-emerald-700" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {relationshipWeaknesses.length > 0 ? (
                <article className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-950">
                    <TriangleAlert aria-hidden="true" size={21} />
                    What may need attention
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {relationshipWeaknesses.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-base leading-7 text-amber-950">
                        <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber-700" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {gifts.length > 0 || interpretation?.livingHappilyTips ? (
          <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 sm:p-6" aria-labelledby="guidance-heading">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm">
                <Gift aria-hidden="true" size={20} />
              </span>
              <div>
                <h2 id="guidance-heading" className="text-lg font-semibold text-slate-950 sm:text-xl">
                  Ways to thrive
                </h2>
                <p className="mt-1 text-base leading-7 text-slate-700">
                  Practical themes you can use for reflection and development.
                </p>
              </div>
            </div>

            {gifts.length > 0 ? (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {gifts.map((gift) => (
                  <li key={gift} className="flex items-start gap-3 rounded-lg bg-white p-4 text-base leading-7 text-slate-800 shadow-sm">
                    <Check aria-hidden="true" className="mt-1 shrink-0 text-blue-700" size={19} strokeWidth={2.5} />
                    <span>{gift}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {interpretation?.livingHappilyTips ? (
              <div className="mt-4 w-full rounded-lg border border-blue-200 bg-white p-4 sm:p-5">
                <h3 className="text-lg font-semibold text-slate-950">Practical guidance</h3>
                <div className="mt-4">
                  <NarrativeText
                    accent="violet"
                    fullWidth
                    text={interpretation.livingHappilyTips}
                  />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </ParticipantExperienceShell>
  );
}

import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import type {
  ClientDashboardDto,
  DashboardActivityKind,
  DashboardAnalyticsDto,
} from "@/services/dashboard-service";

interface DashboardOverviewProps {
  dashboard: ClientDashboardDto;
  analytics: DashboardAnalyticsDto;
  userEmail: string;
}

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function displayName(email: string) {
  const localPart = email.split("@")[0] ?? "there";
  const words = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(" ") || "there";
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatShortDate(value);
}

function pointPath(
  values: number[],
  width: number,
  height: number,
  paddingX = 3,
  paddingY = 4,
) {
  if (!values.length) return "";

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  return values
    .map((value, index) => {
      const x =
        paddingX +
        (values.length === 1 ? usableWidth / 2 : (index / (values.length - 1)) * usableWidth);
      const y = paddingY + (1 - (value - min) / range) * usableHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function Sparkline({
  id,
  values,
  color,
}: {
  id: string;
  values: number[];
  color: string;
}) {
  const line = pointPath(values, 120, 42);
  const area = line ? `${line} L117,42 L3,42 Z` : "";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 42"
      className="h-11 w-24 overflow-visible"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.2" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area ? <path d={area} fill={`url(#${id})`} /> : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: typeof UsersRound;
  iconClassName: string;
  iconBackground: string;
  color: string;
  series?: number[];
  progress?: number;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClassName,
  iconBackground,
  color,
  series,
  progress,
}: MetricCardProps) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgb(15_23_42/0.075)]">
      <div className="flex items-center gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${iconBackground}`}>
          <Icon className={iconClassName} size={19} strokeWidth={2} />
        </span>
        <p className="truncate text-[12px] font-medium text-slate-700">{label}</p>
      </div>
      <div className="mt-4 flex min-h-12 items-end justify-between gap-3">
        <p className="text-[26px] font-semibold leading-none tracking-[-0.035em] text-slate-950">
          {value}
        </p>
        {series ? (
          <Sparkline id={`spark-${label.replace(/\W/g, "").toLowerCase()}`} values={series} color={color} />
        ) : null}
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-700"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
        <span
          className="inline-flex items-center gap-1 font-medium"
          style={{ color }}
        >
          <ArrowUpRight size={12} /> Live
        </span>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function TrendChart({ analytics }: { analytics: DashboardAnalyticsDto }) {
  const width = 720;
  const height = 244;
  const left = 42;
  const right = 12;
  const top = 12;
  const bottom = 30;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const series = [
    { key: "completed" as const, label: "Completed", color: "#2fbd7d" },
    { key: "inProgress" as const, label: "In progress", color: "#2f7df6" },
    { key: "expired" as const, label: "Expired", color: "#f0525f" },
  ];
  const maximum = Math.max(
    1,
    ...analytics.trend.flatMap((point) =>
      series.map((item) => point[item.key]),
    ),
  );

  function linePath(key: (typeof series)[number]["key"]) {
    return analytics.trend
      .map((point, index) => {
        const x =
          left +
          (analytics.trend.length === 1
            ? chartWidth / 2
            : (index / (analytics.trend.length - 1)) * chartWidth);
        const y = top + (1 - point[key] / maximum) * chartHeight;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }

  const dateIndexes = [0, 7, 14, 21, analytics.trend.length - 1].filter(
    (value, index, values) => value >= 0 && values.indexOf(value) === index,
  );

  return (
    <section className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-900">Assessments over time</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {series.map((item) => (
              <span key={item.key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 shadow-sm">
          Last 30 days
        </span>
      </div>

      <div className="mt-3 overflow-hidden">
        <svg
          role="img"
          aria-label="Assessment status trend over the last 30 days"
          viewBox={`0 0 ${width} ${height}`}
          className="h-[230px] w-full"
        >
          {[0, 1, 2, 3, 4].map((tick) => {
            const y = top + (tick / 4) * chartHeight;
            const label = Math.round(maximum * (1 - tick / 4));

            return (
              <g key={tick}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y}
                  y2={y}
                  stroke="#e8edf4"
                  strokeDasharray="3 4"
                />
                <text x="4" y={y + 4} fill="#718096" fontSize="10">
                  {label}
                </text>
              </g>
            );
          })}
          {series.map((item) => (
            <path
              key={item.key}
              d={linePath(item.key)}
              fill="none"
              stroke={item.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
            />
          ))}
          {series.flatMap((item) =>
            analytics.trend.map((point, index) => {
              if (index % 3 !== 0 && index !== analytics.trend.length - 1) return null;
              const x = left + (index / (analytics.trend.length - 1)) * chartWidth;
              const y = top + (1 - point[item.key] / maximum) * chartHeight;
              return (
                <circle
                  key={`${item.key}-${point.date}`}
                  cx={x}
                  cy={y}
                  r="2.25"
                  fill="white"
                  stroke={item.color}
                  strokeWidth="1.5"
                />
              );
            }),
          )}
          {dateIndexes.map((index) => {
            const point = analytics.trend[index];
            const x = left + (index / (analytics.trend.length - 1)) * chartWidth;
            return (
              <text
                key={point.date}
                x={x}
                y={height - 4}
                textAnchor={index === 0 ? "start" : index === analytics.trend.length - 1 ? "end" : "middle"}
                fill="#718096"
                fontSize="10"
              >
                {formatShortDate(point.date)}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function QuotaOverview({ dashboard }: { dashboard: ClientDashboardDto }) {
  const total = dashboard.stats.quotaTotal;
  const consumed = dashboard.stats.quotaConsumed;
  const reserved = dashboard.stats.quotaReserved;
  const available = Math.max(total - consumed - reserved, 0);
  const consumedPercent = total ? (consumed / total) * 100 : 0;
  const reservedPercent = total ? (reserved / total) * 100 : 0;
  const availablePercent = total ? (available / total) * 100 : 0;
  const reservedEnd = consumedPercent + reservedPercent;
  const resetDate = dashboard.quotas
    .map((quota) => quota.quotaExpiresAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];

  return (
    <section className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Quota overview</h2>
        <Link
          href="/dashboard/tokens"
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600"
        >
          View details
        </Link>
      </div>

      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[170px_1fr] xl:grid-cols-1 2xl:grid-cols-[170px_1fr]">
        <div
          className="mx-auto grid size-40 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#397df3 0 ${consumedPercent}%, #fb8736 ${consumedPercent}% ${reservedEnd}%, #34b978 ${reservedEnd}% 100%)`,
          }}
        >
          <div className="grid size-[116px] place-items-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgb(226_232_240/0.8)]">
            <div>
              <p className="text-[22px] font-semibold tracking-[-0.04em] text-slate-950">
                {formatNumber(total)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">Total quota</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "Consumed", value: consumed, percent: consumedPercent, color: "#397df3" },
            { label: "Reserved", value: reserved, percent: reservedPercent, color: "#fb8736" },
            { label: "Available", value: available, percent: availablePercent, color: "#34b978" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              <span className="mt-1 size-2 rounded-full" style={{ backgroundColor: item.color }} />
              <div>
                <p className="text-[10px] text-slate-500">{item.label}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-700">
                  {formatNumber(item.value)} <span className="font-normal text-slate-400">({item.percent.toFixed(1)}%)</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
        Next reset: <span className="font-medium text-slate-700">{resetDate ? formatFullDate(resetDate) : "Not scheduled"}</span>
      </p>
    </section>
  );
}

const activityStyles: Record<
  DashboardActivityKind,
  { icon: typeof ClipboardCheck; className: string }
> = {
  assessment: { icon: CheckCircle2, className: "bg-emerald-50 text-emerald-600" },
  participant: { icon: CircleUserRound, className: "bg-violet-50 text-violet-600" },
  token: { icon: KeyRound, className: "bg-blue-50 text-blue-600" },
  consent: { icon: ShieldCheck, className: "bg-emerald-50 text-emerald-600" },
  privacy: { icon: LockKeyhole, className: "bg-orange-50 text-orange-600" },
};

function RecentActivity({ analytics }: { analytics: DashboardAnalyticsDto }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Recent activity</h2>
        <Link href="/dashboard/results" className="text-[10px] font-medium text-blue-600 hover:text-blue-700">
          View all
        </Link>
      </div>
      <div className="mt-3 divide-y divide-slate-100">
        {analytics.recentActivity.length ? (
          analytics.recentActivity.map((activity) => {
            const style = activityStyles[activity.kind];
            const Icon = style.icon;

            return (
              <div key={activity.id} className="flex items-start gap-3 py-2.5 first:pt-1">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${style.className}`}>
                  <Icon size={15} strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-slate-800">{activity.title}</p>
                  <p className="mt-0.5 truncate text-[9px] text-slate-500">{activity.description}</p>
                </div>
                <span className="shrink-0 pt-0.5 text-[9px] text-slate-400">{timeAgo(activity.occurredAt)}</span>
              </div>
            );
          })
        ) : (
          <div className="grid min-h-48 place-items-center text-center">
            <div>
              <Clock3 className="mx-auto text-slate-300" size={24} />
              <p className="mt-2 text-xs font-medium text-slate-600">No recent activity</p>
              <p className="mt-1 text-[10px] text-slate-400">New events will appear here.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TopAssessments({
  dashboard,
  analytics,
}: {
  dashboard: ClientDashboardDto;
  analytics: DashboardAnalyticsDto;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Top assessments</h2>
        <Link href="/dashboard/tokens" className="text-[10px] font-medium text-blue-600 hover:text-blue-700">
          View all
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[510px]">
          <div className="grid grid-cols-[minmax(180px,1.5fr)_70px_1fr_80px] gap-3 px-1 text-[9px] text-slate-500">
            <span>Assessment</span>
            <span>Completed</span>
            <span>Completion rate</span>
            <span className="text-right">Available</span>
          </div>
          <div className="mt-1 divide-y divide-slate-100">
            {analytics.assessments.length ? (
              analytics.assessments.slice(0, 5).map((assessment, index) => {
                const quota = dashboard.quotas.find((row) => row.testId === assessment.testId);
                const colors = [
                  "bg-violet-50 text-violet-600",
                  "bg-blue-50 text-blue-600",
                  "bg-amber-50 text-amber-600",
                  "bg-emerald-50 text-emerald-600",
                ];

                return (
                  <div
                    key={assessment.testId}
                    className="grid grid-cols-[minmax(180px,1.5fr)_70px_1fr_80px] items-center gap-3 px-1 py-3 text-[10px]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`grid size-7 shrink-0 place-items-center rounded-full ${colors[index % colors.length]}`}>
                        <ClipboardCheck size={13} />
                      </span>
                      <span className="truncate font-medium text-slate-700">{assessment.testName}</span>
                    </div>
                    <span className="text-slate-600">{assessment.completed}</span>
                    <div className="flex items-center gap-2">
                      <span className="w-9 text-slate-600">{assessment.completionRate.toFixed(1)}%</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-emerald-500"
                          style={{ width: `${assessment.completionRate}%` }}
                        />
                      </span>
                    </div>
                    <span className="text-right font-medium text-slate-700">{formatNumber(quota?.quotaAvailable ?? 0)}</span>
                  </div>
                );
              })
            ) : (
              <div className="grid min-h-40 place-items-center text-center">
                <div>
                  <ClipboardCheck className="mx-auto text-slate-300" size={24} />
                  <p className="mt-2 text-xs font-medium text-slate-600">No assessment activity yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultDistribution({ analytics }: { analytics: DashboardAnalyticsDto }) {
  const maximum = Math.max(1, ...analytics.resultDistribution.map((item) => item.value));

  return (
    <section className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Result profile distribution</h2>
        <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-medium text-slate-600">
          All results
        </span>
      </div>
      {analytics.resultDistribution.length ? (
        <div className="mt-6">
          <div className="flex h-40 items-end gap-3 border-b border-slate-200 bg-[linear-gradient(to_bottom,transparent_24%,#eef2f7_25%,transparent_26%,transparent_49%,#eef2f7_50%,transparent_51%,transparent_74%,#eef2f7_75%,transparent_76%)] px-2">
            {analytics.resultDistribution.map((item, index) => (
              <div key={item.label} className="flex h-full min-w-0 flex-1 items-end">
                <div
                  className="relative w-full rounded-t-sm bg-gradient-to-t from-blue-500 to-blue-300 shadow-[0_-4px_12px_rgb(59_130_246/0.12)]"
                  style={{ height: `${Math.max(7, (item.value / maximum) * 100)}%` }}
                >
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-500">
                    {item.value}
                  </span>
                  {index === 0 ? <span className="absolute inset-x-0 top-0 h-px bg-blue-200" /> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3 px-2">
            {analytics.resultDistribution.map((item) => (
              <span key={item.label} className="min-w-0 flex-1 truncate text-center text-[9px] text-slate-500">
                {item.label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-500">Assessment profile</p>
        </div>
      ) : (
        <div className="grid min-h-52 place-items-center text-center">
          <div>
            <BarChart3 className="mx-auto text-slate-300" size={25} />
            <p className="mt-2 text-xs font-medium text-slate-600">No result profiles yet</p>
            <p className="mt-1 text-[10px] text-slate-400">Completed assessments will populate this chart.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Compliance({ analytics }: { analytics: DashboardAnalyticsDto }) {
  const rows = [
    {
      icon: ShieldCheck,
      iconClassName: "bg-emerald-50 text-emerald-600",
      label: "Consents recorded",
      detail: `${formatNumber(analytics.compliance.consentsRecorded)} records on file`,
      value: `${analytics.compliance.consentCoverage}%`,
    },
    {
      icon: LockKeyhole,
      iconClassName: "bg-blue-50 text-blue-600",
      label: "Data retention",
      detail: `${formatNumber(analytics.compliance.retainedResults)} retained results`,
      value: analytics.compliance.retentionCompliant ? "Compliant" : "Review",
    },
    {
      icon: CircleUserRound,
      iconClassName: "bg-violet-50 text-violet-600",
      label: "Erasure requests",
      detail: "Processed anonymization requests",
      value: formatNumber(analytics.compliance.erasureRequests),
    },
  ];

  return (
    <section className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_3px_12px_rgb(15_23_42/0.035)] sm:p-5">
      <h2 className="text-[13px] font-semibold text-slate-900">Compliance &amp; privacy</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 py-3.5 first:pt-1">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ${row.iconClassName}`}>
                <Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-slate-800">{row.label}</p>
                <p className="mt-1 truncate text-[9px] text-slate-500">{row.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[12px] font-medium text-slate-900">{row.value}</span>
                <span className="grid size-4 place-items-center rounded-full border border-emerald-500 text-emerald-600">
                  <Check size={9} strokeWidth={2.5} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <Link
        href="/dashboard/results"
        className="mt-1 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] font-medium text-blue-600 hover:text-blue-700"
      >
        View result records
        <ChevronRight size={14} />
      </Link>
    </section>
  );
}

export function DashboardOverview({
  dashboard,
  analytics,
  userEmail,
}: DashboardOverviewProps) {
  const quotaAvailable = Math.max(
    dashboard.stats.quotaTotal - dashboard.stats.quotaUsed,
    0,
  );
  const completionSeries = analytics.trend.map((point) => point.completed);
  const completionRateSeries = analytics.trend.map((point) =>
    point.issued ? (point.completed / point.issued) * 100 : 0,
  );
  const quotaPercent = dashboard.stats.quotaTotal
    ? (quotaAvailable / dashboard.stats.quotaTotal) * 100
    : 0;
  const firstDate = analytics.trend[0]?.date;
  const lastDate = analytics.trend.at(-1)?.date;

  return (
    <div className="dashboard-reveal">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-slate-950 sm:text-[28px]">
            {greeting()}, {displayName(userEmail)} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Here&apos;s what&apos;s happening with your talent assessments.
          </p>
        </div>
        <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 shadow-sm">
          <CalendarDays size={15} className="text-slate-500" />
          {firstDate && lastDate ? `${formatShortDate(firstDate)} – ${formatFullDate(lastDate)}` : "Last 30 days"}
        </div>
      </header>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Participants"
          value={formatNumber(analytics.participantsTotal)}
          detail="across the directory"
          icon={UsersRound}
          iconClassName="text-violet-600"
          iconBackground="bg-violet-50"
          color="#7c3aed"
          series={analytics.trend.map((point) => point.participants)}
        />
        <MetricCard
          label="Assessments completed"
          value={formatNumber(analytics.completedTotal)}
          detail={`${analytics.resultsTotal} result records`}
          icon={CheckCircle2}
          iconClassName="text-emerald-600"
          iconBackground="bg-emerald-50"
          color="#16a36a"
          series={completionSeries}
        />
        <MetricCard
          label="Completion rate"
          value={`${analytics.completionRate.toFixed(1)}%`}
          detail={`of ${formatNumber(analytics.assessmentsTotal)} issued`}
          icon={BarChart3}
          iconClassName="text-blue-600"
          iconBackground="bg-blue-50"
          color="#2563eb"
          series={completionRateSeries}
        />
        <MetricCard
          label="In progress"
          value={formatNumber(analytics.inProgressTotal)}
          detail={`${formatNumber(analytics.expiredTotal)} expired`}
          icon={Clock3}
          iconClassName="text-orange-600"
          iconBackground="bg-orange-50"
          color="#f97316"
          series={analytics.trend.map((point) => point.inProgress)}
        />
        <MetricCard
          label="Quota available"
          value={formatNumber(quotaAvailable)}
          detail={`of ${formatNumber(dashboard.stats.quotaTotal)}`}
          icon={KeyRound}
          iconClassName="text-blue-600"
          iconBackground="bg-blue-50"
          color="#2563eb"
          progress={quotaPercent}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.92fr)_minmax(0,1fr)]">
        <TrendChart analytics={analytics} />
        <QuotaOverview dashboard={dashboard} />
        <RecentActivity analytics={analytics} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <TopAssessments dashboard={dashboard} analytics={analytics} />
        <ResultDistribution analytics={analytics} />
        <Compliance analytics={analytics} />
      </section>

      <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-[linear-gradient(110deg,#f7f5ff_0%,#fbfaff_52%,#f6f8ff_100%)] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-white shadow-[0_5px_14px_rgb(79_70_229/0.24)]">
            {analytics.nextTokenExpiryAt ? <ShieldCheck size={15} /> : <Sparkles size={15} />}
          </span>
          <div>
            <p className="text-[11px] font-semibold text-indigo-700">
              {analytics.nextTokenExpiryAt ? "Upcoming access expiry" : "Access lifecycle is healthy"}
            </p>
            <p className="mt-0.5 text-[9px] text-slate-500">
              {analytics.nextTokenExpiryAt
                ? `Next live assessment access expires ${formatFullDate(analytics.nextTokenExpiryAt)}.`
                : "There are no live access expiries requiring attention."}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/tokens"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 text-[10px] font-medium text-indigo-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50"
        >
          Review access
          <ChevronRight size={13} />
        </Link>
      </section>
    </div>
  );
}

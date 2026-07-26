import type {
  ParticipantDirectoryActivityFilter,
  ParticipantDirectoryQuery,
  ParticipantDirectorySort,
  ParticipantDirectoryStatusFilter,
} from "@/services/participant-directory-service";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseParticipantDirectoryQuery(
  searchParams: SearchParams,
): ParticipantDirectoryQuery {
  const requestedPage = Number.parseInt(firstValue(searchParams.page) ?? "1", 10);

  return {
    search: (firstValue(searchParams.q) ?? "").trim().slice(0, 120),
    status: oneOf<ParticipantDirectoryStatusFilter>(
      firstValue(searchParams.status),
      ["all", "active", "archived"],
      "all",
    ),
    activity: oneOf<ParticipantDirectoryActivityFilter>(
      firstValue(searchParams.activity),
      ["all", "live_access", "has_results", "no_results"],
      "all",
    ),
    sort: oneOf<ParticipantDirectorySort>(
      firstValue(searchParams.sort),
      ["recent", "name"],
      "recent",
    ),
    page:
      Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

export function participantDirectoryHref(
  query: ParticipantDirectoryQuery,
  page: number,
) {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.status !== "all") params.set("status", query.status);
  if (query.activity !== "all") params.set("activity", query.activity);
  if (query.sort !== "recent") params.set("sort", query.sort);
  if (page > 1) params.set("page", String(page));

  const suffix = params.toString();
  return suffix ? `/dashboard/participants?${suffix}` : "/dashboard/participants";
}

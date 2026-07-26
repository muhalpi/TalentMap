import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

import { participantDirectoryHref } from "@/lib/participant-directory-query";
import type { ParticipantDirectoryDto } from "@/services/participant-directory-service";

export function ParticipantDirectoryControls({
  directory,
}: {
  directory: ParticipantDirectoryDto;
}) {
  const { query } = directory;
  const hasFilters = Boolean(
    query.search ||
      query.status !== "all" ||
      query.activity !== "all" ||
      query.sort !== "recent",
  );
  const firstResult = directory.filteredProfiles
    ? (query.page - 1) * directory.pageSize + 1
    : 0;
  const lastResult = Math.min(
    query.page * directory.pageSize,
    directory.filteredProfiles,
  );

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_3px_12px_rgb(15_23_42/0.035)]">
      <form
        action="/dashboard/participants"
        method="get"
        role="search"
        className="grid gap-3 p-4 lg:grid-cols-[minmax(240px,1fr)_150px_170px_150px_auto] lg:items-end"
      >
        <div className="min-w-0">
          <label
            htmlFor="participant-search"
            className="mb-1.5 block text-xs font-medium text-foreground/65"
          >
            Search participants
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/45"
              size={16}
            />
            <input
              id="participant-search"
              name="q"
              type="search"
              defaultValue={query.search}
              placeholder="Name, email, identifier, tag, or custom field"
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="participant-status"
            className="mb-1.5 block text-xs font-medium text-foreground/65"
          >
            Profile status
          </label>
          <select
            id="participant-status"
            name="status"
            defaultValue={query.status}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="participant-activity"
            className="mb-1.5 block text-xs font-medium text-foreground/65"
          >
            Assessment activity
          </label>
          <select
            id="participant-activity"
            name="activity"
            defaultValue={query.activity}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          >
            <option value="all">All activity</option>
            <option value="live_access">Live access</option>
            <option value="has_results">Has results</option>
            <option value="no_results">No results</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="participant-sort"
            className="mb-1.5 block text-xs font-medium text-foreground/65"
          >
            Sort by
          </label>
          <select
            id="participant-sort"
            name="sort"
            defaultValue={query.sort}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          >
            <option value="recent">Recently updated</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <SlidersHorizontal aria-hidden="true" size={16} />
            Apply
          </button>
          {hasFilters ? (
            <Link
              href="/dashboard/participants"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-foreground/65 transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Clear participant search and filters"
              title="Clear filters"
            >
              <X aria-hidden="true" size={17} />
            </Link>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-muted/55 px-4 py-3">
        <p className="text-sm text-foreground/65" aria-live="polite">
          Showing <span className="font-mono font-medium text-foreground">{firstResult}–{lastResult}</span> of{" "}
          <span className="font-mono font-medium text-foreground">
            {directory.filteredProfiles}
          </span>
          {hasFilters ? ` matching ${directory.totalProfiles} profiles` : " profiles"}
        </p>

        {directory.pageCount > 1 ? (
          <nav
            aria-label="Participant directory pages"
            className="flex items-center gap-2"
          >
            {query.page > 1 ? (
              <Link
                href={participantDirectoryHref(query, query.page - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground/70 transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <ChevronLeft aria-hidden="true" size={16} />
                Previous
              </Link>
            ) : null}
            <span className="px-1 font-mono text-xs text-foreground/55">
              Page {query.page} of {directory.pageCount}
            </span>
            {query.page < directory.pageCount ? (
              <Link
                href={participantDirectoryHref(query, query.page + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground/70 transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Next
                <ChevronRight aria-hidden="true" size={16} />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

# TALENTMAP - CURRENT ARCHITECTURE BLUEPRINT

Current as of July 16, 2026.

TalentMap is a multi-tenant psychometric testing platform for internal
provisioning, client-managed participant assessment, consent capture, scoring,
results, retention, and participant privacy operations.

## Operating Rules

- Tenant boundary is `client_id`.
- Every participant, token, result, consent, draft, quota, and audit mutation
  must be scoped by `client_id`.
- Use the service layer in `src/services` for data access from routes and UI.
- Do not rewrite the scoring engine or test registry. Instruments live under
  `src/tests/instruments/*` and expose the shared test definition/scoring
  contract.
- Soft delete is not legal erasure. Participant erasure must anonymize PII.

## Access Model

TalentMap is a closed B2B platform.

Definitions:

- A `client` is a company or organization that purchases TalentMap services or
  operates under a project or contract with our company.
- An `admin` is an internal user from our company who provisions and manages
  clients, contracts, entitlements, quotas, retention operations, and platform
  configuration.
- A `client_user` is a provisioned user account associated with a specific
  client organization and limited to that client's workspace and data.
- A `participant` is not a normal account holder and does not self-register.
  Participants use the shared `/test` entry URL with a participant-specific,
  assessment access code issued for an existing tenant profile.

Account provisioning rules:

- There is no public sign-up flow.
- External organizations cannot create their own tenant or admin accounts.
- Client user accounts are created or provisioned by our company as part of
  client onboarding or project setup.
- Admin accounts are internal-only and controlled by our company.
- Participant access exchanges a hash-only code for a signed, short-lived,
  `HttpOnly` assessment session and does not create a reusable login account.

Authorization intent:

- Internal admins manage client lifecycle and platform operations.
- Client users operate only within their own tenant boundary.
- Public users cannot browse, register, or create accounts in the platform.

## Current Stack

- Framework: Next.js App Router.
- ORM: Drizzle ORM.
- Database: PostgreSQL/Neon.
- Test data shape: raw answers and scored result JSON are stored as JSONB so
  each instrument can keep its native scoring structure.
- Visual direction: warm, document-like Notion-inspired UI with restrained
  chrome, compact operational screens, and blue as the primary action color.

## Implemented App Surfaces

Admin:

- `/admin` provisioning overview.
- `/admin/clients` client list.
- `/admin/clients/new` client creation.
- `/admin/clients/[clientId]` contract, entitlements, tokens, and results.
- `/admin/instruments` instrument catalog.
- `/admin/retention` retention overview and manual sweep trigger.

Client dashboard:

- `/dashboard` client workspace overview.
- `/dashboard/tokens` assessment access creation, rotation, and lifecycle.
- `/dashboard/results` result list.
- `/dashboard/results/[resultId]` result detail.
- `/dashboard/participants` participant directory.
- `/dashboard/participants/[participantId]` participant detail, history, edit,
  and anonymization action.

Participant flow:

- `/test` accepts a participant access code and resumes a valid assessment
  session without putting credentials in the URL.
- `/test/[token]` is a compatibility exchange for previously issued links and
  immediately redirects to the clean `/test` URL.
- Consent is required before an assignment can move from `active` to
  `in_progress`.
- Draft autosave and resume are supported.
- Completed submissions score server-side and lock the assignment.

Internal APIs and jobs:

- `/api/session/login`
- `/api/session/logout`
- `/api/test/access`
- `/api/test/consent`
- `/api/test/start`
- `/api/test/draft`
- `/api/test/submit`
- `/api/dashboard/demo/tokens`
- `/api/dashboard/results/export`
- `/api/dashboard/tokens/[tokenId]/reissue`
- `/api/internal/quota-reservations/run`
- `/api/internal/retention/run`

## UI State Model

The UI is an operational console, not a marketing surface. Screens should be
dense enough for repeated admin/client work while staying readable on the warm
Notion-style canvas.

Global shell:

- `src/components/layout/app-shell.tsx` owns the authenticated admin and client
  navigation frame.
- Active navigation state should be visible through restrained contrast and the
  primary blue accent.
- Global page headers should identify the workspace, explain the current task
  in one short line, and avoid duplicating form instructions already visible in
  controls.

Status colors:

- `active` or successful/completed states use the blue/accent treatment.
- `in_progress` and retention due/flagged states use warning styling.
- `expired`, unauthorized, invalid, destructive, or failed states use danger
  styling.
- Neutral/default rows use muted surface styling.
- Shared token status styling lives in `src/components/dashboard/status.ts`.

Server-action forms:

- Shared submit/message/error primitives live in
  `src/components/admin/form-controls.tsx`.
- Submit buttons show a spinner and pending label while a server action is
  running.
- `ActionMessage` is used for success and error feedback and is announced with
  `aria-live`.
- `FieldError` shows the first field validation message directly under the
  field.
- Forms should preserve their compact card layout and use explicit labels,
  not placeholder-only inputs.

Empty states:

- Tables render an inline empty state instead of a blank region.
- Empty copy should describe the missing record type and the next useful action,
  for example generating a token or creating a participant.
- Empty states should stay inside the table/card area that would normally hold
  rows.

Admin UI states:

- Client rows expose client status, quota allocation, contract end, and
  contract-based retention grace.
- Client detail tabs split contract settings, test entitlements, tokens, and
  results.
- Retention operations show aggregate totals, contract end, grace end, due now,
  flagged, deleted, and next due date.
- Manual retention and entitlement actions use server-action pending/success
  feedback.

Client dashboard UI states:

- Access tables show assessment lifecycle: `active`, `in_progress`, `completed`, and
  `expired`.
- Result tables show participant identity where allowed, result label,
  submitted date, "Retain Until", retention status, and view/export actions.
- Participant pages show profile data, token/result history, edit state, and
  anonymization controls.
- Anonymized participants must not appear as normal profiles.

Participant test UI states:

- `/test` first handles access-code exchange, session validation, rate limits,
  expired/completed assignments, missing/inactive participant profiles, and
  missing consent.
- Consent has explicit `required`, `accepted`, `declined`, `pending`, and
  `error` states.
- The test runner draft lifecycle is `loading`, `idle`, `saving`, `saved`, and
  `error`.
- Submission disables duplicate sends while pending.
- Completed demo submissions can render client-side results without persistence;
  real submissions persist results and lock the assignment.

Retention UI states:

- `active` results are visible and exportable until their retain-until date.
- Due active results appear in retention counts before the sweep flags them.
- `flagged_for_deletion` results are in the grace window.
- `deleted` results have assessment payloads cleared and are excluded from
  client views/exports.

## Current Database Model

`clients`

- Owns tenant identity, slug, status, contract start, and contract end.
- `contract_ends_at` is the source of truth for result retention.

`client_users`

- Provisioned users belonging to a client organization, scoped to a
  single client tenant.

`tests`

- Per-client unlocked test definitions and versions.

## Instrument Registry

The source of truth for available and planned assessments is
`src/tests/registry.ts`.

Current instrument states:

- `mbti` - MBTI Personality Type. Adapted and implemented.
- `kts2` - KTS-II Questionnaire. Reserved, pending adaptation.
- `mmpi` - MMPI. Reserved, pending adaptation.
- `bfi` - Big Five Work Style Profile (IPIP-BFM-50). Adapted and implemented.
- `sds` - Self-Directed Search. Reserved, pending adaptation.
- `papi` - PAPI. Reserved, pending adaptation.
- `disc` - DISC Assessment. Reserved, pending adaptation.

Rules:

- Admin provisioning should only enable instruments marked as implemented.
- Pending instruments may appear in the admin registry as roadmap/reserved
  items, but participant tokens should not be generated for them.
- New instruments should be added through the registry and implement the shared
  `TestDefinition` contract before being exposed to clients.

`client_test_quotas`

- Tracks `quota_total`, `quota_used`, `quota_reserved`, `quota_consumed`, and
  optional `quota_expires_at`.
- `quota_available = quota_total - quota_reserved - quota_consumed`.
- Reserved quota represents generated active or in-progress links.
- Consumed quota represents completed assessments.

`participants`

- Client-scoped participant/talent profiles.
- `name` is mandatory. `email`, the neutral platform identifier stored in
  `employee_id`, `external_reference`, and tags are optional standard fields.
- Tenant-defined values live in `metadata.customFields`; tags remain separate
  in `metadata.tags`.
- Normal directory queries exclude `status = anonymized`.
- Deduplication is enforced per client for email, employee ID, and external
  reference when present.

`participant_field_definitions`

- Tenant-scoped definitions for structured participant fields, including a
  stable key, tenant-facing label, data type, choice options, required/search
  behavior, sensitivity, active state, and display order.
- Supported types are short text, long text, number, date, email, phone,
  single choice, multiple choice, and yes/no.
- Archived definitions preserve existing participant values. Sensitive fields
  are excluded from directory search and list summaries.

`participant_tokens`

- Hash-only participant access codes with a rotation version used to invalidate
  older participant sessions.
- May point to `participant_id`.
- Keeps `participant_reference` as a legacy fallback for unlinked tokens.
- Status values are `active`, `in_progress`, `completed`, and `expired`.
- Expiry is bounded by the earlier of client contract end and quota expiry.
- `test_key` records the assessment type independently of its version.
- A partial unique index permits only one `active` or `in_progress` row for the
  same client, participant, and test type.

`participant_consents`

- Immutable consent records per token.
- Stores `consent_version`, `consent_text_snapshot`, optional `ip_hash`,
  optional `user_agent`, and `accepted_at`.
- Entering `/test` does not create consent and does not start the assignment.

`participant_answer_drafts`

- Stores in-progress answers as JSONB by token.
- Used for participant resume.
- Cleared after successful submission and deleted during participant
  anonymization.

`results`

- Stores submitted answers, structured score output, score summary,
  interpretation, submission time, retention deadline, and retention status.
- `participant_id` is set from the token at submission time where available.
- Client-facing result list/detail/export queries exclude
  `retention_status = deleted`.

`participant_anonymization_audits`

- Records participant anonymization actions, requester, generated anonymized
  label, reason, and affected row counts.

`test_rate_limit_buckets`

- Stores hashed token/IP rate-limit buckets for participant test routes.

## Core Workflows

### Client Provisioning

Internal admins create clients, set contract dates, assign status, unlock tests,
and configure quotas. Contract dates control participant token eligibility and
result retention.

### Participant Directory

Client users configure tenant-wide participant field definitions and then create
or manage profiles using those fields. This keeps the directory relevant for
companies, schools, and other institutions without adding new account types.
Participant XLSX templates are generated from the tenant's active definitions,
and imported rows receive the same type and required-field validation as the UI.
Participant detail pages show assessment history and linked result records.
Anonymized participants are hidden from normal directory views.

### Assessment Access And Quota

Client users create participant assessment access against an enabled test
entitlement. New access requires a registered, active participant profile.
Access creation:

- Validates the client, test, quota, contract window, and quota expiry.
- Requires available quota based on reserved plus consumed counts.
- Rejects a second live assignment of the same test type for the participant.
- Reserves quota atomically.
- Stores only the normalized access-code hash and a short preview.
- Returns the shared `/test` URL and the access code once.

Access rotation replaces the code on the same live assignment, increments its
session version, preserves quota and in-progress drafts, and invalidates the
previous code and participant sessions.

### Consent, Draft, And Submission

Participant flow:

- Invalid and high-volume access-code attempts are rate-limited by both code
  and IP buckets.
- Consent must be accepted before starting.
- Consent snapshots include organization, assessment, collected data, purpose,
  retention, access, and deletion contact.
- Draft answers are saved as JSONB and can be loaded when the participant
  resumes.
- Submission scores server-side, creates a result, marks the token completed,
  converts one reserved quota into consumed quota, and clears the draft.

## Current Retention Policy

Result retention follows the client contract period.

Rules:

- On submission, `results.retention_until` is set to
  `clients.contract_ends_at`.
- Result tables label this date as "Retain Until".
- Changing a client's contract end date realigns all non-deleted result
  deadlines for that client.
- If a contract is renewed into the future, non-deleted results that were only
  `flagged_for_deletion` can be restored to `active`.
- `RETENTION_DELETE_GRACE_DAYS` is currently `30`.
- After the contract end date, results become due for retention processing.
- The retention sweep first changes due active results to
  `flagged_for_deletion`.
- After the 30-day grace period, flagged results are anonymized/deleted by
  clearing `raw_answers` and `scored_result`, nulling `score_summary` and
  `interpretation`, setting `retention_status = deleted`, and setting
  `deleted_at`.
- Retention-deleted results remain excluded from client result views and
  exports.

Operational endpoints:

- Admin page: `/admin/retention`.
- Job endpoint: `/api/internal/retention/run`.
- Allowed methods: `GET` and `POST`.
- Auth: bearer token matching `RETENTION_JOB_SECRET` or `CRON_SECRET`, or
  `x-retention-secret`.
- Vercel cron: `0 17 * * *`, which is 00:00 Jakarta time.

Migration:

- `drizzle/0005_contract_bound_retention.sql` realigns existing non-deleted
  results to the owning client's contract end date.
- `drizzle/0006_great_piledriver.sql` drops the retired
  `clients.retention_days` column and its old non-negative check constraint.

## Participant Anonymization

Participant anonymization is implemented as a tenant-scoped service.

When a participant is anonymized:

- `participants.name` becomes a generated label such as `Deleted_User_8F92A`.
- `email`, `employee_id`, `external_reference`, and `metadata` are cleared.
- `status` becomes `anonymized`.
- `deleted_at` and `anonymized_at` are set.
- Linked active or in-progress assignments are expired.
- Assignment participant links and legacy participant references are cleared.
- Reserved quota for expired tokens is released.
- Drafts are deleted.
- Consent IP/user-agent fields are scrubbed.
- Results are unlinked from the participant.
- An audit row is inserted.

Result data can remain for aggregate-safe analysis unless the retention sweep
deletes it later.

## Quota Reservation Cleanup

Unused assessment reservations are cleaned by an internal job.

Rules:

- Expired active/in-progress assignments are moved to `expired`.
- Reserved quota is released only for rows actually expired.
- Updates are grouped by `client_id` and `test_id`.
- The worker is designed to be idempotent.

Operational endpoint:

- `/api/internal/quota-reservations/run`
- Allowed methods: `GET` and `POST`.
- Auth: bearer token matching `QUOTA_RESERVATION_JOB_SECRET`,
  `QUOTA_JOB_SECRET`, or `CRON_SECRET`, or `x-quota-reservation-secret` /
  `x-quota-secret`.
- Vercel cron: `0 0 * * *`, which is 07:00 Jakarta time.

## Result And Export Rules

- Every result query must enforce `client_id`.
- Exports exclude `retention_status = deleted`.
- Participant PII is not shown for anonymized participants.
- Result rows show participant identity when available, test, result label,
  submitted date, retain-until date, retention status, and actions.

## Security Rules

- Return raw participant access codes only at creation or rotation time.
- Persist only normalized code hashes, short previews, and an access version.
- Avoid logging raw access codes.
- Exchange a valid code for a signed, `HttpOnly`, `SameSite` participant
  session before loading the assessment.
- Keep credentials out of newly generated URLs.
- Rate limit code entry with per-code and per-IP buckets and rate limit
  participant APIs by IP plus assignment/session identity.
- Server actions and route handlers must verify auth/authorization inside the
  mutation, not only rely on protected UI.

## Remaining Technical Notes

- The current production retention model is contract end date plus grace period,
  not submission date plus a configurable day count.
- PostgreSQL RLS policy scaffolding exists in `src/db/rls-policies.sql`; app
  code currently enforces tenant isolation in the service layer.

# TALENTMAP - CURRENT ARCHITECTURE BLUEPRINT

Current as of July 26, 2026.

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
- A result is either a platform assessment or an XLSX import. `results.source`
  records which, and a check constraint keeps `token_id` and `imported_at`
  consistent with it.
- Spreadsheet templates, parsing, and exports live in
  `src/services/spreadsheet-workbook.ts`. Import validation reports issues per
  sheet, row, and column instead of failing on the first bad cell.

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

Current login implementation:

- `/login` is still a first-pass role chooser. It posts a role to
  `/api/session/login`, and `src/auth/login-service.ts` resolves the first
  seeded internal admin or the seeded demo client without verifying any
  credential.
- The signed `tm_session` cookie is re-resolved against `internal_admin_users`
  or `client_users` on every protected request, so role separation and tenant
  scoping hold once a session exists.
- Credential verification is the outstanding gap before external client access.
  See "Remaining Technical Notes".

## Current Stack

- Framework: Next.js App Router.
- ORM: Drizzle ORM.
- Database: PostgreSQL/Neon.
- Validation: Zod at every route handler and server-action boundary.
- Spreadsheets: ExcelJS for participant/result templates, imports, and exports.
- Tests: the Node test runner through `tsx --test`, enumerated in the
  `test` script in `package.json`.
- Test data shape: raw answers and scored result JSON are stored as JSONB so
  each instrument can keep its native scoring structure.
- Visual direction: deep navy navigation shell on a cool gray canvas, compact
  white data surfaces, and blue as the primary action color.
  `TALENTMAP_DESIGN.md` is the authoritative design system and global tokens
  live in `src/app/globals.css`.

## Implemented App Surfaces

Public:

- `/` marketing landing page. This is the only marketing surface.
- `/login` session entry.

Admin:

- `/admin` provisioning overview.
- `/admin/clients` client list.
- `/admin/clients/new` client creation.
- `/admin/clients/[clientId]` contract, entitlements, tokens, and results.
- `/admin/clients/[clientId]/results/[resultId]` admin result detail.
- `/admin/instruments` instrument catalog.
- `/admin/retention` retention overview and manual sweep trigger.

Client dashboard:

- `/dashboard` client workspace overview and analytics.
- `/dashboard/tokens` assessment access creation, rotation, cancellation, and
  lifecycle.
- `/dashboard/results` result list, XLSX result import, and XLSX export.
- `/dashboard/results/[resultId]` result detail and single-result export.
- `/dashboard/participants` participant directory, profile creation, XLSX
  participant import, and tenant field definition management.
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

Session:

- `/api/session/login`
- `/api/session/logout`

Participant assessment:

- `/api/test/access` exchanges an access code for a session (`POST`) and clears
  it (`DELETE`).
- `/api/test/consent`
- `/api/test/start`
- `/api/test/draft`
- `/api/test/submit`

Client dashboard:

- `/api/dashboard/tokens` creates participant assessment access.
- `/api/dashboard/demo/tokens` compatibility alias for the route above.
- `/api/dashboard/tokens/[tokenId]/reissue`
- `/api/dashboard/tokens/[tokenId]/cancel`
- `/api/dashboard/results/export`
- `/api/dashboard/import/participants`
- `/api/dashboard/import/results`
- `/api/dashboard/import/templates/participants`
- `/api/dashboard/import/templates/results`

Admin:

- `/api/admin/clients/[clientId]/results/export`
- `/api/admin/clients/[clientId]/tokens/[tokenId]/reissue`
- `/api/admin/clients/[clientId]/tokens/[tokenId]/cancel`

Jobs:

- `/api/internal/quota-reservations/run`
- `/api/internal/retention/run`

There is no `middleware.ts`. Every handler resolves its own session through
`getClientSession`, `getInternalAdminSession`, or the participant assessment
session, and tenant data responses set `Cache-Control: no-store`.

## UI State Model

The authenticated UI is an operational console. Screens should be dense enough
for repeated admin/client work while staying readable on the cool gray canvas
defined in `TALENTMAP_DESIGN.md`.

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

- The overview renders live tenant analytics: quota and assessment counts, a
  dated issued/completed/in-progress/expired trend, per-instrument completion
  rates, result distribution, recent activity, next token expiry, and
  consent/retention compliance.
- Access tables show assessment lifecycle: `active`, `in_progress`,
  `completed`, and `expired`, plus rotate and cancel actions on live rows.
- Result tables show participant identity where allowed, result label,
  submitted date, "Retain Until", retention status, source, and view/export
  actions.
- Result rows are badged `platform_assessment` or `xlsx_import` so imported
  history is never presented as a platform-administered sitting.
- Participant pages show profile data, token/result history, edit state, and
  anonymization controls.
- The participant directory exposes search, status filter, activity filter, and
  sort, and its empty state distinguishes "no profiles yet" from "no matches for
  the current filters".
- Tenant participant field definitions are managed inline, including archived
  definitions.
- Spreadsheet import panels have `idle`, `uploading`, `success`, and `error`
  states and render the per-sheet/row/column issue list on rejection.
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

The runner has two presentations, chosen by the instrument's `presentation`
field. Presentation is a UI concern only: neither one changes which questions
exist, how many an instrument defines, or how an answer is stored.

- `single-question` is the default and covers every instrument that does not opt
  in. One question per screen, and a selection advances the screen on its own.
- `forced-choice-grid` presents one group per screen as a four-row table with a
  Term column, a Most column, and a Least column. A 28-group instrument is 28
  screens standing on 56 questions, and each screen writes two ordinary answers
  keyed by the two question ids the group names.

Forced-choice group screen states:

- A group is `empty`, `partial`, or `complete`. `partial` is its own state
  because a group with one column filled is not finished; the group map marks it
  with a dashed border, a corner dot, and its state in the cell's accessible
  name, and progress counts only complete groups.
- The screen advances by itself only when a POINTER commit completes a group.
  The arrow keys check a native radio as focus moves onto it, so a keyboard
  commit never advances; the participant moves on with Previous and Next, which
  are always available.
- An automatic advance moves focus into the new group's Most column, and each
  screen change is announced through a polite live region, because Previous and
  Next change the whole screen without moving focus.
- The consent overview counts group screens rather than questions and names them
  as word groups, so it does not promise twice the work.

A word cannot be both Most and Least in the same group, for an instrument that
declares `exclusiveWithinGroup`. The rule has one implementation, in
`src/tests/shared/forced-choice.ts`, and is enforced at all four points where an
answer can enter the system:

- The grid UI enforces it structurally. Choosing a word in one column disables
  that word's cell in the other, so the invalid state cannot be produced;
  changing the first choice re-enables the cell it had blocked, and a selection
  the participant made is never silently cleared.
- `PUT /api/test/draft` rejects a group whose two sides are equal. A partial
  group is still legitimate, so only an equal pair is refused. The check runs
  ahead of the demo short-circuit, so a demo run behaves like a real one.
- `POST /api/test/submit` rejects an equal pair before scoring, and names the
  groups to reopen rather than reporting a generic scoring failure.
- XLSX result import reports an equal pair as a per-cell issue naming the sheet,
  the row, and the offending column, alongside the other per-cell answer checks.
- Scoring deliberately still tolerates an equal pair: it nets that group to zero
  and counts it in `summary.ambiguousGroups`, so a result stored before these
  gates existed still renders instead of crashing a report. Because all four
  entry points now refuse it, `ambiguousGroups` is 0 for any newly captured
  result, and a non-zero count marks historical or imported data.
- A stored answer map that already carries an equal pair (legacy or imported) is
  reported rather than repaired: the participant is told which groups to reopen
  and decides which of the two answers changes. Autosave pauses while such a map
  would be rejected, and the on-screen notice says so.

Retention UI states:

- `active` results are visible and exportable until their retain-until date.
- Due active results appear in retention counts before the sweep flags them.
- `flagged_for_deletion` results are in the grace window.
- `deleted` results have assessment payloads cleared and are excluded from
  client views/exports.

## Current Database Model

`internal_admin_users`

- Internal, company-side admin accounts with a unique email and an
  `admin`/`owner` role. Seeded, never self-registered.

`clients`

- Owns tenant identity, slug, status, contract start, and contract end.
- `contract_ends_at` is the source of truth for result retention.

`client_users`

- Provisioned users belonging to a client organization, scoped to a
  single client tenant.

`tests`

- Per-client unlocked test definitions and versions.
- A tenant may retain an older version row. Delivery and import queries select
  the row matching the current implemented scoring version.

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

- Stores in-progress answers as JSONB by token, one row per token.
- Also stores per-question timings and the participant's current question index
  so a resumed session returns to the same place.
- Used for participant resume.
- Cleared after successful submission and deleted during participant
  anonymization.

`results`

- Stores submitted answers, structured score output, score summary,
  interpretation, per-question timings, total duration, submission time,
  retention deadline, and retention status.
- `source` is `platform_assessment` or `xlsx_import`.
- `token_id` is unique. A check constraint requires it for platform assessments
  and forbids it for imports, which must instead carry `imported_at` alongside
  `imported_by_client_user_id` and `imported_file_name`.
- `participant_id` is set from the token at submission time where available, and
  from the workbook row for imports.
- Client-facing result list/detail/export queries exclude
  `retention_status = deleted`.

`participant_anonymization_audits`

- Records participant anonymization actions, requester, generated anonymized
  label, reason, and affected row counts.

`test_rate_limit_buckets`

- Stores hashed token/IP rate-limit buckets for participant test routes.

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
- `disc` - DISC Work Behaviour Profile. Adapted and implemented.

Rules:

- Admin provisioning should only enable instruments marked as implemented.
- Pending instruments may appear in the admin registry as roadmap/reserved
  items, but participant tokens should not be generated for them.
- Reserved instruments carry no questions and their `score` throws, so they must
  never be exposed for client delivery or spreadsheet import.
- New instruments should be added through the registry and implement the shared
  `TestDefinition` contract before being exposed to clients.

### DISC Adaptation Notes

The DISC item bank and its norming data cannot be re-derived from the module
code. This is the provenance a maintainer needs before editing anything under
`src/tests/instruments/disc`.

- The 112-adjective bank, its group membership, its within-group display order,
  and its D/I/S/C keying come from the licensed 28-group forced-choice
  instrument supplied by the platform operator. All of it was transcribed from
  the operator's running app plus the companion SQL keying, not authored here.
- 13 of the 112 adjectives score on one side only, Most or Least, never both.
  The Most and Least tallies therefore do not sum to a fixed total, and the
  change scores do not sum to zero. That asymmetry is source norming, not a
  transcription defect, and must not be "corrected".
- The reachable maxima are Most `D 27 / I 26 / S 24 / C 28` and Least
  `D 27 / I 27 / S 26 / C 26`. The unit tests assert those figures against the
  bank itself, so they are the guard that catches a mis-keyed adjective.
- The quantity the instrument norms is an INTENSITY from 1 to 28, not a segment.
  Each of the 12 conversion tables - one per graph and dimension - maps a raw
  score to an intensity, and the segment is that intensity in bands of four:
  `segment = ceil(intensity / 4)`, so segment 1 is intensity 1-4, segment 2 is
  5-8, and so on to segment 7 for 25-28. That relation held for all 202 rows of
  the source `results` table with no exception, which is why the module stores
  the intensity tables and derives the segment rather than storing both.
  Consequence: two dimensions in the same segment sit at DIFFERENT heights on a
  graph, so a graph cannot be drawn from segments alone. The Private graph's
  conversion is inverted, a low Least tally giving a HIGH intensity, and the
  per-dimension midlines are asymmetric about zero. Symmetric or shared bands
  must never be substituted for these tables.
- The source `pattern_map` was verified synthetic: its pattern is the Dominance
  segment, plus 7 whenever the Influence segment is odd, with Steadiness and
  Conscientiousness absent from the formula entirely. It maps both `6-4-2-4` and
  `6-6-2-4` to the same pattern, so it cannot reproduce the operator's own
  report, and it is deliberately not used. The 17 patterns are derived from the
  perceived graph instead, and their interpretive text is original because the
  source pattern table carried only placeholders (`name1`..`name14`).
- The DiSC Classic "classical pattern" names - "Result-oriented",
  "Inspirational", and the rest - come from a licensed table this codebase does
  not hold. They are never guessed at, never reconstructed, and never printed.
  Every surface that shows a pattern name shows TalentMap's own derivation and
  says so in the same breath: the report field list, the figure's pattern strip,
  the panel beside each graph, the figure's accessible description, and the XLSX
  Analysis sheet all carry that attribution. Nothing may imply otherwise.

### DISC Result Presentation

`src/components/results/disc-profile-report.tsx` is the one report body, shared
by the participant result screen (`disc-participant-result.tsx`) and the
dashboard result page (`disc-result-report.tsx`), the same arrangement BFI uses.
`disc-graph.tsx` holds the figure and the segment readout.

- Three graphs, one per reading, behind an ARIA tablist that opens on Graph III:
  Graph III Change (from the change scores, and the graph the pattern is derived
  from), Graph I Most, Graph II Least. All three panels are in the DOM; the two
  that are not shown are hidden on screen and revealed for print, so a printed or
  exported report is complete.
- A point's vertical position is its INTENSITY on the 1-28 scale, 1 at the
  bottom. The segment is only printed. Plotting from the segment would collapse
  two dimensions that share one onto the same line, which the operator's own
  report does not do.
- The report field list follows the printed report: Segment, Pattern, Emotions,
  Goal, Judges others by, Influences others by, Value to the organization,
  Overuses, Under pressure, Fears, Would increase effectiveness through,
  Description. The nine narrative fields are authored per pattern and are copied
  onto `result.patternDetail` by `scoreDiscAnswers`, so both surfaces print all
  twelve from the payload alone.
- BUNDLE PURITY, and why the narrative is stored rather than looked up. The
  participant result screen is reachable from `participant-test-runner.tsx`, a
  client entry, so every value import it can reach is compiled into the
  participant's JavaScript. A DISC instrument module would take the item bank
  with it, and that bank is the answer key. Every component under
  `src/components/results` and `src/components/test` therefore imports the
  instrument for TYPES ONLY;
  `src/components/test/participant-client-graph.test.ts` walks that import graph
  and fails on any value import other than the score type guards.
- Nothing on these surfaces is conveyed by colour alone, every number drawn in
  the SVG is repeated in the figure's accessible description and again in the
  dimension table, and both horizontal scroll containers are focusable and named
  so the right-hand half of the chart is reachable by keyboard at phone width.

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
- `PUT /api/test/draft` replaces the whole stored answer map, so autosave is held
  shut until the load on mount has SUCCEEDED. A load that is still in flight
  defers its first save and then sends the merged map; a load that FAILED leaves
  autosave shut for the rest of the session and tells the participant so, because
  writing a map this session never read would replace a stored draft with only
  what it happens to hold. `canPersistDraft` in
  `src/components/test/draft-resume.ts` owns that decision.
- Answers chosen before the stored draft arrives are merged with it rather than
  replaced by it: the first screen is interactive from mount, so answering before
  the response lands is ordinary.
- Submission scores server-side, creates a result, marks the token completed,
  converts one reserved quota into consumed quota, and clears the draft.

### Spreadsheet Import And Export

Client users can move participant and result data through XLSX workbooks.

Upload rules:

- Uploads must be `.xlsx`, non-empty, and 10 MB or smaller.
- Participant imports are capped at 1,000 rows; result imports at 500 rows.
- Validation collects every issue with sheet, row, and column context and
  rejects the whole workbook rather than importing part of it.

Participant imports:

- Templates are generated from the tenant's active field definitions.
- Rows receive the same type, required-field, and choice-option validation as
  the UI, plus in-workbook and per-client duplicate checks for email, employee
  identifier, and external reference.

Result imports:

- Templates are generated per instrument and may be scoped to one participant.
- Raw answers are scored by the platform; the workbook never supplies scores.
- A row requires an active tenant contract, an active participant in the tenant,
  an enabled entitlement on the current implemented scoring version, an
  unexpired entitlement, and available quota for the whole batch.
- For an instrument that declares `exclusiveWithinGroup`, a row whose two sides
  of a group answer the same option is invalid data, reported as a per-cell issue
  against the Least cell and naming the Most cell to change.
- Imported results are stored with `source = xlsx_import`, no token, an
  `imported_at` timestamp, and the importing client user and file name. They
  consume quota like platform sittings and follow the same retention deadline.
- The import is all-or-nothing: if quota or insertion cannot cover every
  prepared row, the whole statement fails and nothing is stored.

Exports:

- Result exports build a workbook separating summary, dimensions, analysis, and
  raw answers, for either the tenant result list or a single result.
- Admin exports use the same builder scoped to one client.
- Dimension Scores is shared by every instrument and an operator's saved formula
  or query points at a column LETTER, so a new column is APPENDED, never inserted
  among the existing ones. `spreadsheet-workbook.test.ts` pins the position of
  the thirteen columns that predate DISC.
- A DISC export carries the three intensities per dimension alongside the three
  segments. Without them the export cannot reproduce a graph, because the graph
  plots the intensity.

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
  submitted date, retain-until date, retention status, source, and actions.
- Imported and platform-administered results must remain distinguishable in
  every list, detail view, and export.

## Migration Notes

Post-retention migrations, in addition to the retention realignment above:

- `drizzle/0007_flawless_tenebrous.sql` adds per-question timings to drafts and
  results, plus `results.duration_seconds`.
- `drizzle/0008_living_gertrude_yorkes.sql` adds `participant_tokens.test_key`
  and `access_version`, retires already-expired and duplicate live assignments
  while releasing their reserved quota, then creates the partial unique index
  that allows only one live assignment per client, participant, and test type.
- `drizzle/0009_curved_reavers.sql` introduces `result_source`, makes
  `results.token_id` nullable, adds the import columns and the
  `results_source_integrity` constraint, and converts previously
  placeholder-token imports into real `xlsx_import` rows.
- `drizzle/0010_fat_quentin_quire.sql` creates
  `participant_field_definitions`, derives definitions for the legacy
  role/department/location metadata keys, and moves those values into
  `metadata.customFields`.

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

- Login does not verify credentials yet. `/login` posts a role and
  `src/auth/login-service.ts` returns a session for the first seeded internal
  admin or the seeded demo client, so anyone who can reach `/login` can mint an
  admin session. Real credential verification must land before external client
  access. Every other access control assumes this is closed.
- The current production retention model is contract end date plus grace period,
  not submission date plus a configurable day count.
- PostgreSQL RLS policy scaffolding exists in `src/db/rls-policies.sql`; app
  code currently enforces tenant isolation in the service layer.
- `demo-mbti`, `demo-bfi`, and `demo-disc` are recognized as demo access codes.
  They run a full assessment and render a client-side result without creating a
  participant, consent, quota, or result row. The codes are derived from the map
  in `src/lib/demo-test-token.ts`, so an instrument without an entry there has
  no demo path.
- `client_test_quotas.quota_used` is a derived mirror of
  `quota_reserved + quota_consumed`. Every quota mutation must keep it in sync.
- The retention sweep and quota reservation cleanup are platform-wide internal
  jobs and are intentionally not scoped to a single `client_id`.
- `docs/architecture.md` is the short-form summary of this document. Keep the
  two in sync when the tenancy or instrument contract changes.

# TALENTMAP - CURRENT ARCHITECTURE BLUEPRINT

Current as of July 9, 2026.

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
- `/dashboard/tokens` token generation and token lifecycle.
- `/dashboard/results` result list.
- `/dashboard/results/[resultId]` result detail.
- `/dashboard/participants` participant directory.
- `/dashboard/participants/[participantId]` participant detail, history, edit,
  and anonymization action.

Participant flow:
- `/test/[token]` resolves a hash-only participant token.
- Consent is required before a token can move from `active` to `in_progress`.
- Draft autosave and resume are supported.
- Completed submissions score server-side and lock the token.

Internal APIs and jobs:
- `/api/test/[token]/consent`
- `/api/test/[token]/start`
- `/api/test/[token]/draft`
- `/api/test/[token]/submit`
- `/api/dashboard/results/export`
- `/api/dashboard/tokens/[tokenId]/reissue`
- `/api/internal/quota-reservations/run`
- `/api/internal/retention/run`

## Current Database Model

`clients`
- Owns tenant identity, slug, status, contract start, and contract end.
- `contract_ends_at` is the source of truth for result retention.

`client_users`
- Client-side users scoped to a client.

`tests`
- Per-client unlocked test definitions and versions.

`client_test_quotas`
- Tracks `quota_total`, `quota_used`, `quota_reserved`, `quota_consumed`, and
  optional `quota_expires_at`.
- `quota_available = quota_total - quota_reserved - quota_consumed`.
- Reserved quota represents generated active or in-progress links.
- Consumed quota represents completed assessments.

`participants`
- Client-scoped participant/talent profiles.
- Important fields: `name`, `email`, `employee_id`, `external_reference`,
  `metadata`, `status`, `deleted_at`, `anonymized_at`.
- Normal directory queries exclude `status = anonymized`.
- Deduplication is enforced per client for email, employee ID, and external
  reference when present.

`participant_tokens`
- Hash-only single-use participant links.
- May point to `participant_id`.
- Keeps `participant_reference` as a legacy fallback for unlinked tokens.
- Status values are `active`, `in_progress`, `completed`, and `expired`.
- Expiry is bounded by the earlier of client contract end and quota expiry.

`participant_consents`
- Immutable consent records per token.
- Stores `consent_version`, `consent_text_snapshot`, optional `ip_hash`,
  optional `user_agent`, and `accepted_at`.
- Opening `/test/[token]` does not create consent and does not start the token.

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

Client users can create and manage participants, including name, email,
employee ID, external reference, and metadata. Participant detail pages show
assessment history and linked result records. Anonymized participants are hidden
from normal directory views.

### Token Generation And Quota

Client users generate participant tokens against an enabled test entitlement.
Token creation:
- Validates the client, test, quota, contract window, and quota expiry.
- Requires available quota based on reserved plus consumed counts.
- Reserves quota atomically.
- Stores only the token hash and a short preview.

Token reissue retires the old unused token, releases the old reservation, and
generates a new token.

### Consent, Draft, And Submission

Participant flow:
- Invalid and high-volume token access is rate-limited.
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

## Participant Anonymization

Participant anonymization is implemented as a tenant-scoped service.

When a participant is anonymized:
- `participants.name` becomes a generated label such as `Deleted_User_8F92A`.
- `email`, `employee_id`, `external_reference`, and `metadata` are cleared.
- `status` becomes `anonymized`.
- `deleted_at` and `anonymized_at` are set.
- Linked active or in-progress tokens are expired.
- Token participant links and participant references are cleared.
- Reserved quota for expired tokens is released.
- Drafts are deleted.
- Consent IP/user-agent fields are scrubbed.
- Results are unlinked from the participant.
- An audit row is inserted.

Result data can remain for aggregate-safe analysis unless the retention sweep
deletes it later.

## Quota Reservation Cleanup

Unused token reservations are cleaned by an internal job.

Rules:
- Expired active/in-progress tokens are moved to `expired`.
- Reserved quota is released only for rows actually expired.
- Updates are grouped by `client_id` and `test_id`.
- The worker is designed to be idempotent.

Operational endpoint:
- `/api/internal/quota-reservations/run`
- Allowed methods: `GET` and `POST`.
- Auth: bearer token matching `QUOTA_RESERVATION_JOB_SECRET`,
  `QUOTA_JOB_SECRET`, or `CRON_SECRET`, or `x-quota-reservation-secret` /
  `x-quota-secret`.
- Vercel cron: `0 * * * *`.

## Result And Export Rules

- Every result query must enforce `client_id`.
- Exports exclude `retention_status = deleted`.
- Participant PII is not shown for anonymized participants.
- Result rows show participant identity when available, test, result label,
  submitted date, retain-until date, retention status, and actions.

## Security Rules

- Store raw participant tokens only at creation time and return them once.
- Persist only token hashes and short previews.
- Avoid logging raw tokens.
- Rate limit participant test pages and test APIs by IP plus token hash.
- Invalid token attempts have stricter limits.
- Server actions and route handlers must verify auth/authorization inside the
  mutation, not only rely on protected UI.

## Remaining Technical Notes

- The current production retention model is contract end date plus grace period,
  not submission date plus a configurable day count.
- PostgreSQL RLS policy scaffolding exists in `src/db/rls-policies.sql`; app
  code currently enforces tenant isolation in the service layer.

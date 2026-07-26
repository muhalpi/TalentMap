# TalentMap Architecture

TalentMap is a multi-tenant psychometric testing platform. The database tenant boundary is `client_id`; every client-facing table includes it, and all service-layer queries must filter by it or derive it from a validated participant token.

Participant profile customization is tenant-scoped through `participant_field_definitions`. Values are stored in `participants.metadata.customFields`, while tags remain a standard `metadata.tags` array. Field definitions—not individual profiles—control keys, types, required validation, search visibility, and sensitivity. Sensitive fields must not be included in directory search or compact list summaries.

## Runtime Shape

- Internal admins provision clients, unlocked tests, quotas, contract dates, and retention windows.
- Clients assign purchased tests to registered participants and receive the shared `/test` URL plus a participant-specific access code.
- Only one `active` or `in_progress` assignment of a test type may exist for the same tenant participant. Completed and expired assignments do not block a later assignment.
- Participants enter the code at `/test`; the server resolves its hash and exchanges it for a signed, short-lived, `HttpOnly` assessment session. The code never appears in newly generated URLs.
- Test instruments live under `src/tests/instruments/*` and expose a common definition/scoring contract.
- Results store both raw answers and structured score output as JSONB so each instrument can keep its native scoring shape.

## Tenant Isolation

Application queries should use the service layer in `src/services` rather than reaching into Drizzle directly from UI routes. PostgreSQL row-level security policies can be applied from `src/db/rls-policies.sql` once the auth/session strategy is finalized.

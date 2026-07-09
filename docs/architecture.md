# TalentMap Architecture

TalentMap is a multi-tenant psychometric testing platform. The database tenant boundary is `client_id`; every client-facing table includes it, and all service-layer queries must filter by it or derive it from a validated participant token.

## Runtime Shape

- Internal admins provision clients, unlocked tests, quotas, contract dates, and retention windows.
- Clients generate single-use participant tokens for tests they have purchased.
- Participants access `/test/[token]` without an account. The token resolves the tenant, test, status, and expiry.
- Test instruments live under `src/tests/instruments/*` and expose a common definition/scoring contract.
- Results store both raw answers and structured score output as JSONB so each instrument can keep its native scoring shape.

## Tenant Isolation

Application queries should use the service layer in `src/services` rather than reaching into Drizzle directly from UI routes. PostgreSQL row-level security policies can be applied from `src/db/rls-policies.sql` once the auth/session strategy is finalized.

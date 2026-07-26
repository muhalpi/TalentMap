# TalentMap Architecture

TalentMap is a multi-tenant psychometric testing platform. The database tenant boundary is `client_id`; every client-facing table includes it, and all service-layer queries must filter by it or derive it from a validated participant token.

Participant profile customization is tenant-scoped through `participant_field_definitions`. Values are stored in `participants.metadata.customFields`, while tags remain a standard `metadata.tags` array. Field definitions—not individual profiles—control keys, types, required validation, search visibility, and sensitivity. Sensitive fields must not be included in directory search or compact list summaries.

## Runtime Shape

- Internal admins provision clients, unlocked tests, quotas, contract dates, and retention windows.
- Clients assign purchased tests to registered participants and receive the shared `/test` URL plus a participant-specific access code.
- Only one `active` or `in_progress` assignment of a test type may exist for the same tenant participant. Completed and expired assignments do not block a later assignment.
- Participants enter the code at `/test`; the server resolves its hash and exchanges it for a signed, short-lived, `HttpOnly` assessment session. The code never appears in newly generated URLs.
- Test instruments live under `src/tests/instruments/*` and expose a common definition/scoring contract. Beyond questions and scoring, a definition may declare how it is presented (`presentation`, `forcedChoiceGroups`) and that a group's two sides must not carry the same answer (`exclusiveWithinGroup`). Presentation never changes which questions exist or how an answer is stored.
- DISC is the first instrument to use that: its 28 adjective groups are presented as 28 forced-choice grid screens, each with a Most and a Least column, while its 56 questions (`g01m`/`g01l` through `g28m`/`g28l`) and their `"A"`–`"D"` answers persist exactly as a single-question instrument's do. Draft autosave, resume, scoring, and the XLSX `q01`–`q56` round trip are unchanged by the grid.
- The exclusivity rule has a single implementation, `forcedChoiceGroupConflicts` in `src/tests/shared/forced-choice.ts`, and four enforcement points read it: the grid UI (structurally, by disabling the opposite cell), `PUT /api/test/draft`, `POST /api/test/submit`, and XLSX result import. A client control is a convenience, never a guarantee, so the server repeats the check.
- An instrument's item bank also holds its scoring keys, so client components must not import one. A participant screen receives only the public question payload and the forced-choice group metadata; `src/components/test/participant-client-graph.test.ts` enforces this by walking the runner's value-import graph.
- Results store both raw answers and structured score output as JSONB so each instrument can keep its native scoring shape.
- Because a result surface may not import an instrument either, anything interpretive a report needs is written onto the score output at scoring time rather than looked up at render time. DISC's report field list is the worked example: `scoreDiscAnswers` copies the derived pattern's nine authored narrative fields onto `result.patternDetail`, so the participant screen and the dashboard render the same twelve rows from `src/components/results/disc-profile-report.tsx`, the one shared report body. A score type guard checks a stored payload structurally and does not require fields added later, so a report reads each such field defensively and says what is missing rather than printing `undefined`.
- A stored score is also a record of what a reader was shown. Where a payload and the current authored text both offer a field, the payload wins and the lookup is only the fallback for a record written before the field existed.

## Tenant Isolation

Application queries should use the service layer in `src/services` rather than reaching into Drizzle directly from UI routes. PostgreSQL row-level security policies can be applied from `src/db/rls-policies.sql` once the auth/session strategy is finalized.

# Memory: Site Network Module

> Quick-reference for AI assistants working on `modules/site-network/`.

## Status

Complete and stable. Do not refactor unless explicitly asked.

## Key Facts

- **Backend port:** 4040
- **Frontend port:** 5173
- **DB:** SQLite file at `backend/data/app.db` (auto-created)
- **Auth:** Dual-token (access JWT 15min + refresh 7d), HttpOnly cookies
- **Roles:** ADMIN (full CRUD), VIEWER (read-only)
- **Seed users:** admin@sna.com / viewer@sna.com

## Domain Rules to Preserve

1. Study: Planned → Active (needs Active site) → Completed (terminal).
2. Site: Planned → Active (needs examiner with valid cert) → Closed (terminal).
3. SSE assignment requires: study_sites row + site_examiners row + valid certificate.
4. Unassign site from study blocked if SSE rows exist for that study-site pair.
5. Site auto-downgrades to Planned if last examiner unassigned.
6. All mutations audit-logged with before/after JSON.
7. No hard deletes anywhere.

## Architecture Layers

```
Resolvers → Services → Repositories → DB (better-sqlite3)
```

- Resolvers: auth guards + Zod validation + audit logging.
- Services: business rules + orchestration.
- Repositories: raw parameterized SQL.

## Test Coverage

- Backend: 10 unit + 4 integration test files.
- Frontend: 12 component test files.
- E2E: 3 Playwright specs.

## Do NOT

- Move or rename any files in this module.
- Change the auth mechanism without explicit instruction.
- Add an ORM — raw SQL is intentional.
- Remove any test files or reduce coverage.

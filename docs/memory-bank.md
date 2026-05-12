# TrialForge — Memory Bank

> This file is the canonical reference for AI assistants (Amazon Q, etc.) working in this repo.
> It captures invariants, standards, and rules that must be preserved across all interactions.

---

## Coding Standards

- **Language:** TypeScript (strict mode) everywhere — backend and frontend.
- **API:** GraphQL via Apollo Server (backend) + Apollo Client (frontend). No REST except `/health`.
- **Validation:** Zod schemas on both sides. Backend is authoritative; frontend is UX defense-in-depth.
- **DB:** Raw SQL via `better-sqlite3` (no ORM). Parameterized queries only.
- **Formatting:** Consistent with existing module style. No auto-reformatting of untouched files.
- **Imports:** Explicit, no barrel re-exports unless already established in a module.

## Invariants (NEVER violate)

1. **No hard deletes.** Entities use soft-delete/archive. `archived_at` column, never `DELETE FROM`.
2. **Audit everything.** All mutations log to `audit_logs` with before/after JSON snapshots.
3. **Module isolation.** Modules never import from each other. Shared code → `packages/`.
4. **Synthetic data only.** No real PII. Seed scripts use fake data.
5. **HttpOnly cookies for auth.** JWTs never in localStorage or exposed to JS.
6. **Refresh token rotation.** Single-use tokens; old token revoked on each refresh.

## Auth & Audit Policies

- Dual-token: access JWT (15 min) + refresh token (7 days, SHA-256 hashed in DB).
- All admin mutations require `ADMIN` role (enforced by `requireAdmin` guard).
- Audit log captures: action, entityType, entityId, actorUserId, actorEmail, beforeJson, afterJson.
- Refresh tokens: never hard-deleted, `revoked_at` set on logout/rotation.

## Module Boundary Rules

- Each module lives in `modules/<name>/` with its own `backend/`, `frontend/`, `e2e/`, `package.json`.
- Each module owns its own DB schema (SQLite file in dev, Postgres schema later).
- Cross-module communication: GraphQL APIs only (no direct DB access across modules).
- Shared types/validation/UI → `packages/shared-types`, `packages/shared-validation`, `packages/shared-ui`.

### Adding a New Module

1. Create `modules/<name>/` with `backend/`, `frontend/`, `package.json`.
2. Add root scripts: `dev:<name>:backend`, `dev:<name>:frontend`, `test:<name>`, `e2e:<name>`.
3. Add `docs/memory/<name>.md` with module-specific context.
4. Document in `docs/architecture.md` module boundaries table.

## Testing Strategy

| Layer | Tool | Approach |
|-------|------|----------|
| Backend unit | Vitest | Real in-memory SQLite, no mocks for repos |
| Backend integration | Vitest + supertest | Full Express+Apollo stack, in-memory DB |
| Frontend component | Vitest + Testing Library | MockedProvider, MemoryRouter |
| E2E | Playwright | Headless Chromium, auto-start servers |

- Coverage priority: backend > frontend > e2e smoke.
- Tests must not depend on external services or network.
- E2E tests generate unique IDs per run to avoid conflicts.

## CI Expectations (Future)

- Each module tested independently in parallel.
- Platform e2e runs after all module tests pass.
- Coverage gates: backend 75%+, frontend 50%+.
- No deploy if any test fails.

## Rules for AI Assistants

1. **Do NOT refactor existing module code** unless explicitly asked.
2. **Always preserve invariants** listed above — especially no-delete, audit, module isolation.
3. **Read existing module docs** (`modules/<mod>/docs/`) before making changes to that module.
4. **Check this memory bank** at the start of any multi-step task.
5. **Keep changes minimal** — prefer small, safe, additive changes over large rewrites.
6. **When in doubt, ask** — don't guess at business rules or domain logic.
7. **Never introduce real credentials** — use placeholders (`<secret>`, `<api-key>`).
8. **Match existing patterns** — if the module uses raw SQL, don't introduce an ORM.

# ADR-0001: Platform Structure — Modular Monolith

## Status

Accepted

## Date

2025-01-01

## Context

TrialForge started as a single module (Site Network Administration). As we plan additional modules (Identity, Patient Registry, Visit Scheduling, eCRF, etc.), we need a structure that:

- Allows independent development of each module.
- Prevents accidental coupling between modules.
- Supports a future migration to microservices without rewriting.
- Keeps the developer experience simple (single repo, simple scripts).

## Decision

Adopt a **modular monolith** structure within a single monorepo:

```
trialforge/
├── modules/<module-name>/     ← self-contained module (backend + frontend + e2e)
├── packages/<shared-lib>/     ← shared code (types, validation, UI)
├── docs/                      ← platform-level documentation
├── e2e/                       ← cross-module e2e tests
└── package.json               ← root orchestration
```

### Rules

1. Each module has its own `backend/`, `frontend/`, `e2e/`, `package.json`.
2. Modules **never** import from each other. Cross-module contracts go through `packages/shared-types`.
3. Each module owns its own database schema.
4. Shared packages are consumed as local dependencies (workspace protocol or relative paths).
5. Root `package.json` provides convenience scripts but does not build modules.

## Consequences

- **Positive:** Clear boundaries, independent deployability later, simple local dev.
- **Positive:** Existing SNA module works unchanged — zero migration cost.
- **Negative:** No workspace-level build orchestration yet (Turborepo/Nx deferred).
- **Negative:** Shared packages require manual versioning until we add a workspace tool.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Polyrepo (one repo per module) | Too much overhead for a learning project; cross-cutting changes are painful |
| Single app with feature folders | Tight coupling risk; harder to extract to services later |
| Nx/Turborepo from day 1 | Premature complexity; can adopt later when >2 modules exist |

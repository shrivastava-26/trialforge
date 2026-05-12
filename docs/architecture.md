# TrialForge — Architecture

## Current State

```
trialforge/
├── modules/
│   └── site-network/      ← Module 1 (SNA) — fully functional
├── packages/              ← shared libs (scaffolded, empty)
├── docs/                  ← platform documentation
├── e2e/                   ← platform-level e2e (future)
└── package.json           ← root orchestration scripts
```

Site Network (SNA) is the first module. It runs independently: Express + Apollo Server + SQLite backend, React + Apollo Client + MUI frontend.

## Target State

**Now:** Modular monolith — each module is self-contained with its own backend + frontend, sharing only types/validation via `packages/`.

**Later:** Microservices — each backend becomes a deployable service behind an API gateway; frontends evolve into microfrontends.

## Module Boundaries

| Module | Responsibility |
|--------|---------------|
| `site-network` | Site/investigator management, feasibility, network analytics |
| `identity` | Users, roles, organizations, authentication, authorization |
| `patient-registry` | Patient enrollment, demographics, consent tracking |
| `visit-scheduling` | Visit windows, scheduling, reminders |
| `ecrf` | Electronic Case Report Forms — form builder + data entry |
| `edc` | Electronic Data Capture — validation, edit checks |
| `query-management` | Data queries, discrepancy resolution |
| `etmf-lite` | Essential document management (Trial Master File) |
| `audit` | Cross-module audit trail |
| `reporting` | Dashboards, exports, analytics |

## Module Communication Rules

1. Modules **never** import from each other directly.
2. Shared code lives in `packages/` (types, validation, UI components).
3. Cross-module data access happens via GraphQL APIs, never direct DB access.
4. Future: event-driven (pub/sub) or GraphQL federation.

## Frontend Strategy

- **Now:** Single React app per module (`modules/<mod>/frontend/`).
- **Later:** Microfrontend shell composing module UIs at runtime (Module Federation or similar).
- Shared UI components in `packages/shared-ui/`.

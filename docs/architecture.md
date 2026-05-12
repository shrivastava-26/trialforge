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
├── packages/              ← shared libs (empty, scaffolded)
├── docs/
├── e2e/
└── package.json           ← root orchestration scripts
```

The Site Network Administration (SNA) module is the first and currently only functional module. It runs independently with its own backend (Express + Apollo Server + SQLite) and frontend (React + Apollo Client + MUI).

## Target State

**Now:** Modular monolith — each module is self-contained with its own backend/frontend, sharing only types and validation via `packages/`.

**Later:** Microservices — each module backend becomes a deployable service behind an API gateway; frontends evolve into microfrontends composed at runtime.

```
Phase 1: Modular Monolith          Phase 2+: Microservices
┌─────────────────────┐            ┌──────────┐  ┌──────────┐
│  Single Dev Server  │     →      │ Service A│  │ Service B│
│  (module per port)  │            └────┬─────┘  └────┬─────┘
└─────────────────────┘                 │              │
                                   ┌────┴──────────────┴────┐
                                   │      API Gateway        │
                                   └─────────────────────────┘
```

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
| `edc` | Electronic Data Capture — data validation, edit checks |
| `query-management` | Data queries, discrepancy resolution |
| `etmf-lite` | Essential document management (Trial Master File) |
| `audit` | Cross-module audit trail, change history |
| `reporting` | Dashboards, exports, analytics |

## Module Communication

- **Phase 1:** Direct imports from `packages/shared-types` for type contracts. Modules do NOT import from each other.
- **Phase 2:** Event-driven (pub/sub) or REST/GraphQL federation for cross-module calls.

## Frontend Strategy

- **Now:** Single React app per module (each module has its own `frontend/`).
- **Later:** Microfrontend shell that composes module UIs at runtime (Module Federation or similar).
- Shared UI components live in `packages/shared-ui/`.

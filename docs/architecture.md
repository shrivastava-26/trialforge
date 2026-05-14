# TrialForge — Architecture

## Current State

```
trialforge/
├── modules/
│   ├── site-network/         ← Module 1 (SNA) — fully functional
│   ├── identity/             ← Module 2 — backend skeleton (Phase 0.2)
│   ├── patient-registry/     ← Module 3 — backend skeleton (Phase 0.3)
│   ├── visit-scheduling/     ← Module 4 — backend skeleton (Phase 0.4)
│   ├── form-builder/         ← Module 5 — backend skeleton (Phase 0.5)
│   ├── edc/                  ← Module 6 — backend skeleton (Phase 0.6)
│   ├── query-management/     ← Module 7 — backend skeleton (Phase 0.7)
│   └── document-management/  ← Module 8 — backend skeleton (Phase 0.8)
├── packages/              ← shared libs (scaffolded, empty)
├── docs/                  ← platform documentation
├── e2e/                   ← platform-level e2e (future)
└── package.json           ← root orchestration scripts
```

### Active Modules

| Module | Port | Status |
|--------|------|--------|
| site-network | Backend 4040, Frontend 5173 | Complete (SNA) |
| identity | Backend 4050 | Backend skeleton with RBAC |
| patient-registry | Backend 4060 | Backend skeleton (Phase 0.3) |
| visit-scheduling | Backend 4070 | Backend skeleton (Phase 0.4) |
| form-builder | Backend 4080 | Backend skeleton (Phase 0.5) |
| edc | Backend 4090 | Backend skeleton (Phase 0.6) |
| query-management | Backend 4100 | Backend skeleton (Phase 0.7) |
| document-management | Backend 4110 | Backend skeleton (Phase 0.8) |

## Target State

**Now:** Modular monolith — each module is self-contained with its own backend + frontend, sharing only types/validation via `packages/`.

**Later:** Microservices — each backend becomes a deployable service behind an API gateway; frontends evolve into microfrontends.

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

## Visit Scheduling RBAC Decision (Phase 0.4)

| Operation | Allowed Roles |
|-----------|---------------|
| Read visits/templates | ADMIN, CRO_MANAGER, SITE_COORDINATOR, DATA_MANAGER, AUDITOR |
| Create/update visit templates | CRO_MANAGER, ADMIN |
| Schedule/complete visits | SITE_COORDINATOR only |
| Update visit status | SITE_COORDINATOR, DATA_MANAGER |
| Archive templates/visits | ADMIN only |

Rationale: SITE_COORDINATOR owns the patient relationship and is the only role that should schedule/complete visits. CRO_MANAGER configures study-level templates but cannot interact with individual patient schedules.

## Form Builder RBAC Decision (Phase 0.5)

| Operation | Allowed Roles |
|-----------|---------------|
| Read forms/fields | ADMIN, CRO_MANAGER, SITE_COORDINATOR, DATA_MANAGER, AUDITOR |
| Create/edit forms & fields | CRO_MANAGER, ADMIN |
| Publish forms | CRO_MANAGER, ADMIN |
| Archive forms | ADMIN only |

Key domain rules:
- Only one ACTIVE version per (studyId, form name) at a time
- Fields cannot be edited once a form is ACTIVE (create new version instead)
- Publishing a new version automatically archives the previous ACTIVE version

## EDC Data Entry RBAC Decision (Phase 0.6)

| Operation | Allowed Roles |
|-----------|---------------|
| Read form instances/responses | ADMIN, CRO_MANAGER, SITE_COORDINATOR, DATA_MANAGER, AUDITOR |
| Create/save/submit form instances | SITE_COORDINATOR only |
| Archive form instances | ADMIN only |

Key domain rules:
- Auto-selects the ONE ACTIVE form for the study when creating an instance
- Cannot create instances for ARCHIVED/CANCELLED visits
- Validates response data against form field definitions (type checking, options, required)
- Submit enforces all required fields; save (draft) does not
- Once SUBMITTED, no further edits allowed

## Query Management RBAC & Behavior (Phase 0.7)

| Operation | Allowed Roles |
|-----------|---------------|
| Read queries/messages | ADMIN, CRO_MANAGER, SITE_COORDINATOR, DATA_MANAGER, AUDITOR |
| Create query (raise) | DATA_MANAGER only |
| Post message | DATA_MANAGER, SITE_COORDINATOR |
| Close / Reopen query | DATA_MANAGER only |
| Archive query | ADMIN only |

Key domain rules:
- Queries attach to a SUBMITTED form instance (not field-level)
- Message thread: multiple back-and-forth messages until closed
- DATA_MANAGER message → status stays/becomes OPEN
- SITE_COORDINATOR message → status becomes ANSWERED
- DATA_MANAGER can close from OPEN or ANSWERED (no site response required)
- Reopen: CLOSED → OPEN (DATA_MANAGER only)
- ARCHIVED blocks all further mutations

## Document Management (eTMF-lite) RBAC Decision (Phase 0.8)

| Operation | Allowed Roles |
|-----------|---------------|
| Read documents/versions | ADMIN, CRO_MANAGER, SITE_COORDINATOR, DATA_MANAGER, MONITOR, AUDITOR |
| Create documents, add versions | CRO_MANAGER, ADMIN |
| Set document status (non-archive) | CRO_MANAGER, ADMIN |
| Archive documents | ADMIN only |

Key domain rules:
- Metadata-only in v0.8: fileRef is a string path/URL, no actual file upload
- Only one ACTIVE version per document at a time
- Adding a new version supersedes the previous ACTIVE version
- Archiving a document archives all its versions
- Cannot add versions to an ARCHIVED document

## Frontend Strategy

- **Now:** Single React app per module (`modules/<mod>/frontend/`).
- **Later:** Microfrontend shell composing module UIs at runtime (Module Federation or similar).
- Shared UI components in `packages/shared-ui/`.

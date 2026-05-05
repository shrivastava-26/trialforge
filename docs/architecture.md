# Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + Apollo Client)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Admin Pages  │  │ Viewer Pages │  │ Shared (Search, Auth) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         └──────────────────┴─────────────────────┘              │
│                            │ GraphQL (Apollo httpLink)           │
└────────────────────────────┼────────────────────────────────────┘
                             │ HTTP POST /graphql (credentials: include)
┌────────────────────────────┼────────────────────────────────────┐
│  Express + Apollo Server   │                                    │
│  ┌─────────────────────────┴──────────────────────────────────┐ │
│  │ Middleware: helmet, requestId, morgan, rateLimit, cookieParser│
│  └─────────────────────────┬──────────────────────────────────┘ │
│  ┌─────────────────────────┴──────────────────────────────────┐ │
│  │ Apollo Context: JWT decode → user, requestId, DataLoaders  │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│  ┌─────────────────────────┴──────────────────────────────────┐ │
│  │ Resolvers: requireAuth/requireAdmin → parseOrThrow → svc   │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│  ┌─────────────────────────┴──────────────────────────────────┐ │
│  │ Services: business logic, domain rules, orchestration      │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│  ┌─────────────────────────┴──────────────────────────────────┐ │
│  │ Repositories: raw SQL, parameterized queries               │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│  ┌─────────────────────────┴──────────────────────────────────┐ │
│  │ better-sqlite3 (synchronous, file-based)                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Backend Layering

| Layer | Responsibility | Rules |
|-------|---------------|-------|
| **Resolvers** | Auth guards, Zod validation, call service, audit logging | Never touch DB directly |
| **Services** | Domain rules, orchestration, status transitions | Never write raw SQL |
| **Repositories** | SQL queries, parameterized statements | Never import from services |
| **DB helpers** | `queryAll<T>`, `queryOne<T>`, connection singleton | Stateless utilities |

## Frontend Layering

| Layer | Responsibility |
|-------|---------------|
| **Pages** | Route-level components, layout wrapping, page-specific state |
| **Components** | Reusable UI (InfoField, StatusChip, StudySitePanel, dialogs) |
| **Hooks** | Data fetching (useStudy, useSites), URL state (useUrlPagination) |
| **Services** | GraphQL document definitions (queries in domain files, mutations in adminService) |
| **Validation** | Zod schemas + form types (mirrors backend schemas) |
| **Utils** | Apollo client, error parsing, audit diff helpers |

## Folder Structure

```
SNA-y2/
├── backend/src/
│   ├── db/              # connection, migrate, query helpers
│   ├── graphql/
│   │   ├── loaders/     # DataLoader factory (per-request)
│   │   ├── resolvers/   # domain-split (auth, study, site, examiner, search, audit)
│   │   └── schema/      # GraphQL type definitions
│   ├── logger/          # winston + morgan
│   ├── middleware/      # requestId, security (helmet, rate-limit)
│   ├── repositories/    # raw SQL per domain
│   ├── services/        # business logic per domain
│   ├── types/           # TypeScript interfaces (Row types, Context)
│   ├── utils/           # jwt, password, token helpers
│   └── validation/      # Zod schemas + parseOrThrow
├── frontend/src/
│   ├── components/
│   │   ├── admin/       # AdminLayout, AdminSidebar
│   │   ├── shared/      # ViewerLayout, ViewerSidebar, ErrorBoundary
│   │   ├── skeletons/   # DashboardSkeleton, DetailPageSkeleton
│   │   └── study/       # StudySitePanel, CertificatePickerDialog
│   ├── contexts/        # AuthContext
│   ├── hooks/           # data hooks + useUrlPagination
│   ├── pages/
│   │   ├── admin/       # CRUD pages + detail + audit history
│   │   ├── viewer/      # read-only equivalents
│   │   └── shared/      # SearchPage (reused by both roles)
│   ├── services/        # GQL documents (queries + mutations)
│   ├── types/           # frontend TypeScript interfaces
│   ├── utils/           # apolloClient, gqlErrors, auditDiff, shared
│   └── validation/      # frontend Zod schemas
├── e2e/                 # Playwright specs
└── docs/                # architecture, database, auth, testing
```

## Key Design Decisions

1. **No ORM** — raw SQL via better-sqlite3 for full control and performance
2. **No REST** — GraphQL as sole API layer (except `/health`)
3. **HttpOnly cookies** — JWT never in localStorage; dual-token with rotation
4. **Server-side pagination** — all list queries return `{ rows, total }`
5. **Audit everything** — CREATE/UPDATE/ASSIGN/UNASSIGN with before/after JSON
6. **No hard deletes** — entities are never removed, only unassigned or status-transitioned
7. **DataLoader per request** — prevents N+1 on type field resolvers
8. **Zod on both sides** — backend is authoritative; frontend is UX defence-in-depth

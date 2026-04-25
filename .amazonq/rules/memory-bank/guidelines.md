# Development Guidelines

## Code Quality Standards

### TypeScript
- `strict: true` enforced in both packages — no implicit `any`, no loose nulls
- Explicit return types on all exported functions
- Interfaces over type aliases for object shapes (`UserRow`, `StudyRow`, `SiteRow`, `ExaminerRow`, `AuditLogRow`, `GraphQLContext`)
- Unknown resolver parent/args typed as `_: unknown, __: unknown` to satisfy strict mode
- `as const` used for literal type narrowing (e.g., `sameSite: 'lax' as const`)
- Optional relation fields on frontend types use `?` (e.g., `sites?: Site[]`)
- `role` is part of both `JwtPayload` and `AuthContextValue` — always typed as `'ADMIN' | 'VIEWER'`

### Naming Conventions
- Files: `camelCase.ts` / `camelCase.tsx`
- Exported functions/hooks: `PascalCase` for components, `camelCase` for everything else
- React hooks: `use` prefix (e.g., `useStudies`, `useStudy`, `useSitesPicker`, `useAuth`)
- GraphQL query/mutation constants: `SCREAMING_SNAKE_CASE` with `_QUERY` / `_MUTATION` suffix
- Database row types: `PascalCase` + `Row` suffix (e.g., `UserRow`, `AuditLogRow`)
- Resolver files named after their domain: `auth.ts`, `study.ts`, `site.ts`, `examiner.ts`, `search.ts`, `audit.ts`
- Admin pages prefixed with `Admin` (e.g., `AdminStudiesPage`); viewer pages prefixed with `Viewer`

### File Organization
- Domain-split modules merged at `index.ts` — never import from sibling domain files directly
- Each concern in its own layer: `db/` → `services/` → `graphql/resolvers/` → `graphql/schema/`
- Types centralized in `types/index.ts` per package
- Shared resolver logic in `helpers.ts` (`requireAuth`, `requireAdmin`, `logAudit`)
- All mutations live in `adminService.ts` on the frontend — never in domain service files
- Shared UI components (SearchPage) accept `layout` + `baseRoute` props for reuse across roles

---

## Architectural Patterns

### Backend — Layered Architecture
```
Request → app.ts (JWT cookie extraction, role decoded into context)
  → Apollo resolver (requireAuth / requireAdmin via helpers.ts)
    → parseOrThrow(zodSchema, input)  ← Zod validation
      → service function (business logic + domain rules)
        → db/query.ts helper (queryAll / queryOne)
          → better-sqlite3 (synchronous)
```
- Resolvers never touch the DB directly — always go through a service
- Services never import from resolvers — one-way dependency
- `getDb()` singleton — call it inside functions, never at module load time

### Role-Based Auth Guards
```typescript
export function requireAuth(context: GraphQLContext): void { ... }   // UNAUTHENTICATED
export function requireAdmin(context: GraphQLContext): void { ... }  // FORBIDDEN
```
- `requireAuth` — any authenticated user (VIEWER or ADMIN)
- `requireAdmin` — ADMIN role only; calls `requireAuth` first
- All protected resolvers call one of these as their first line

### Audit Logging Pattern
```typescript
logAudit(context, 'CREATE' | 'UPDATE', entityType, entityId, beforeJson, afterJson)
```
- Called from every admin CREATE/UPDATE mutation resolver
- Junction-table assign/unassign mutations are NOT logged (consistent policy — applies to study_sites, site_examiners, and study_site_examiners)
- `logAudit` fetches actor email from DB at call time

### Zod Validation Pattern (Backend)
```typescript
export function parseOrThrow<T>(schema, value: unknown): T
// Throws BAD_USER_INPUT GraphQLError with fieldErrors map on failure
```
- Every mutation resolver calls `parseOrThrow` before calling the service
- `fieldErrors` is a flat `Record<string, string>` — one message per field path
- `protocolId` and `siteCode`/`examinerCode` are normalized (`.trim().toUpperCase()`) inside Zod via `.transform()`

### Zod Validation Pattern (Frontend)
```typescript
const { register, handleSubmit, setError } = useForm<T>({ resolver: zodResolver(schema) });
// On BAD_USER_INPUT: map fieldErrors back to form fields via setError
const { code, fieldErrors } = parseGqlError(err);
if (code === 'BAD_USER_INPUT') {
  Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof T, { message: m }));
}
```
- Frontend schemas mirror backend schemas but are simpler (no `.transform()` on create)
- `createStudySchema` includes a client-side `todayLocal()` refine on `startDate` as a UX hint (backend UTC check is authoritative)
- `parseGqlError` in `utils/gqlErrors.ts` extracts `code`, `message`, `fieldErrors` from `ApolloError`

---

## Domain Invariants (Production Rules)

### Study Lifecycle (enforced in `studyService.ts`)

| ID | Rule | Where |
|----|------|--------|
| S1 | `createStudy` always sets status = `Planned`; `status` field removed from `CreateStudyInput` | Zod schema (field absent) + service (hardcodes `'Planned'`) |
| S2 | `updateStudy` status transitions are forward-only: `Planned→Active→Completed` only | Service `enforceStatusTransition()` |
| S3 | Transition to `Active` requires ≥1 site assigned | Service |
| S4 | Transition to `Active` requires ≥1 examiner assigned (SSE union, legacy fallback) | Service |
| S5 | Transition to `Completed` requires ≥1 site assigned | Service |
| S6 | Transition to `Completed` requires ≥1 examiner assigned | Service |
| S7 | Transition to `Completed` requires `endDate` present and ≥ `startDate` | Service |
| S8 | `protocolId` unique + normalized to uppercase | Zod transform + service duplicate check |
| S9 | `startDate` ≤ `endDate` when both present | Zod `superRefine` |
| D1 | `createStudy`: `startDate` must be ≥ today (UTC) | Service |
| D2 | `createStudy`: `endDate` optional; if present, must be ≥ `startDate` | Zod + Service |
| D3 | `updateStudy` (Planned): if `startDate` updated, must be ≥ today | Service |
| D4 | Transition `Planned→Active`: effective `startDate` must be ≤ today | Service |
| D5 | Transition `Planned→Active`: effective `endDate` (if present) must be ≥ today | Service |
| D6 | Transition `Active→Completed`: `endDate` required, ≤ today, ≥ `startDate` | Service |
| D7 | Transition `Planned→Active`: no assigned site may be `Closed` | Service |
| D8 | Transition `Active→Completed`: no assigned site may be `Active` (configurable flag) | Service (`STRICT_STUDY_COMPLETE_REQUIRES_NO_ACTIVE_SITES`) |
| D9 | `unassignSiteFromStudy`: blocked when study is `Active` (configurable flag) | Service (`STRICT_NO_SITE_UNASSIGN_WHEN_STUDY_ACTIVE`) |
| P5 | `page` ≥ 1; `pageSize` 1–100 for list pages, 1–1000 for picker queries | Zod `paginationSchema` / `pickerPaginationSchema` + Resolvers |

### Site Lifecycle (enforced in `siteService.ts`)

| ID | Rule | Where |
|----|------|--------|
| P1 | Setting site to `Active` requires ≥1 examiner assigned | Service |
| P2 | Unassigning last examiner from `Active` site auto-downgrades to `Planned` | Service |
| P3 | `createSite` always sets status = `Planned`; `status` field removed from `CreateSiteInput` | Zod schema (field absent) + service (hardcodes `'Planned'`) |

### Assignment Integrity (enforced in services)

| ID | Rule | Where |
|----|------|--------|
| SI1 | Cannot assign a `Closed` site to a study | `studyService.assignSiteToStudy` |
| SI2 | Cannot unassign a site from a study if SSE rows exist for that pair | `studyService.unassignSiteFromStudy` |
| SI3 | Cannot assign an examiner to a `Closed` site | `siteService.assignExaminerToSite` |
| SI4 | Cannot unassign an examiner from a site if they appear in SSE for that site | `siteService.unassignExaminerFromSite` |
| SI5 | SSE assignment requires (study,site) in `study_sites` AND (site,examiner) in `site_examiners` | `studyService.assignExaminerToStudySite` |

### GraphQL Error Codes
| Code | When to use |
|------|-------------|
| `UNAUTHENTICATED` | Missing/invalid cookie or bad credentials |
| `FORBIDDEN` | Authenticated but wrong role (non-admin) |
| `BAD_USER_INPUT` | Validation failure or domain rule violation — always include `fieldErrors` where possible |
| `INTERNAL_SERVER_ERROR` | Unexpected DB or server errors — do not leak details |

---

## Frontend Patterns

### Study Status UI Rules
```typescript
// frontend/src/validation/studySchemas.ts
export function nextAllowedStatus(current: string): 'Active' | 'Completed' | null
// Returns the one valid next status, or null if terminal (Completed)
```
- Create dialog: no status field shown — displays read-only "Planned" badge; `startDate` has `min=today` HTML constraint; `endDate` min tracks `startDate` reactively via `useWatch`
- Edit dialog: status dropdown shows only `[current, nextAllowed]` — Completed studies have it disabled; `statusHelperText()` shows transition requirements inline; `endDate` gets `max=today` when completing; Save button disabled when `!isDirty`
- Backend is the authoritative source; UI restrictions are UX-only defence-in-depth

### Site Status UI Rules
- Create dialog: no status field shown — displays read-only "Planned" badge (same pattern as studies)
- Edit dialog: status dropdown available; `Active` is blocked server-side if no examiners assigned (P1); `Closed` sites have dropdown disabled; Save button disabled when `!isDirty`
- `createSite` on backend always hardcodes `'Planned'` regardless of any input

### GQL Documents in Service Files
- All `gql` tagged template literals live in `services/` files — never in components or hooks
- Mutations always in `adminService.ts`; queries in domain service files

### Custom Hook Pattern
```typescript
export function useStudies(page = 1, pageSize = 10) {
  const { data } = useQuery(GET_STUDIES_QUERY, { variables: { page, pageSize } });
  return { studies: data?.getStudies?.rows ?? [], total: data?.getStudies?.total ?? 0, loading, error };
}
```
- Always provide `?? []` / `?? null` fallback for optional chaining on query data

### Admin CRUD Dialog Pattern
```typescript
// react-hook-form + zodResolver + notistack + parseGqlError
// All list pages use useUrlPagination() — persists page/pageSize in URL query params
// Edit dialogs disable Save button when !isDirty (no changes made)
async function onSubmit(values) {
  try {
    await mutation({ variables: { input: values } });
    enqueueSnackbar('...success...', { variant: 'success' });
    onClose();
  } catch (err) {
    const { code, message, fieldErrors } = parseGqlError(err);
    if (code === 'BAD_USER_INPUT') {
      Object.entries(fieldErrors).forEach(([f, m]) => setError(f as keyof T, { message: m }));
      enqueueSnackbar('Please correct the highlighted fields.', { variant: 'warning' });
    } else {
      enqueueSnackbar(message, { variant: 'error' });
    }
  }
}
```

### Entity Audit History Pattern
- `EntityAuditHistoryPage` is a shared full-page component accepting `entityType`, `backTo`, `backLabel`, `entityLabel` props
- Thin wrappers `StudyAuditHistoryPage`, `SiteAuditHistoryPage`, `ExaminerAuditHistoryPage` each fetch their entity label and delegate to `EntityAuditHistoryPage`
- Uses server-side pagination via `GET_AUDIT_LOGS_QUERY` with `entityType` + `entityId` + `page` + `pageSize`
- Each row has an expand toggle; expanded rows render an inline `DiffDetail` panel (before→after per field, CREATE shows all fields in green)
- `EntityAuditLogDialog` is an alternative modal variant (non-paginated, limit 100) used inline from detail pages
- Both share the same `diffObjects` / `FIELD_LABELS` diff logic — field keys mapped to human-readable labels
- Routes: `/admin/studies/:id/history`, `/admin/sites/:id/history`, `/admin/examiners/:id/history`

### GET_AUDIT_LOGS_QUERY Signature
```typescript
// adminService.ts — supports both paginated full-page and entity-scoped queries
GET_AUDIT_LOGS_QUERY variables: { entityType?, entityId?, page?, pageSize? }
// Returns: { total, rows: AuditLog[] }
// AuditLogsPage (global) passes no entityId; EntityAuditHistoryPage passes entityType + entityId
```

### AuditLogsPage Pattern (Global)
- Uses MUI `Table` + `TablePagination` (not DataGrid) for full control over expandable rows
- Entity type filter dropdown (`Study` / `Site` / `Examiner` / All) resets page on change
- Accordion expand: only one row open at a time (`expandedRow` state holds single id)
- Inline `DiffDetail` rendered via `<Collapse>` in a second `<TableRow>` immediately below
- `summaryText()` from `utils/auditDiff.ts` generates the summary column text
- `fieldLabel()`, `parseJson()`, `diffObjects()` all imported from `utils/auditDiff.ts`

### useUrlPagination Hook
```typescript
// hooks/useUrlPagination.ts
export function useUrlPagination(defaultPageSize = 10): [GridPaginationModel, setter]
// Persists page + pageSize in URL as ?page=N&pageSize=N
// pageSize clamped to VALID_PAGE_SIZES = [10, 20, 25, 50, 100]
// replace: true so back button skips intermediate page changes
```
- Used by AdminStudiesPage, AdminSitesPage, AdminExaminersPage
- Allows browser back button to restore exact pagination state

### StudySitePanel Pattern (Admin Study Detail)
- Per-site checkbox panel showing available examiners (from `site_examiners`) vs assigned (from `study_site_examiners`)
- Each checkbox toggle calls `ASSIGN_EXAMINER_TO_STUDY_SITE` or `UNASSIGN_EXAMINER_FROM_STUDY_SITE`
- `refetchQuery` passed as prop to avoid closure over stale `id`
- Viewer equivalent (`ViewerStudySitePanel`) is read-only; only renders sites with `examiners.length > 0`
- Study detail page header includes a "History" button linking to `/admin/studies/:id/history`

### Apollo errorLink Deduplication
```typescript
// apolloClient.ts — prevents toast spam on repeated errors
let lastToastKey = '';
let lastToastTime = 0;
function showToastOnce(message, variant, key) {
  const now = Date.now();
  if (key === lastToastKey && now - lastToastTime < 3000) return;
  // ...
}
// FORBIDDEN and INTERNAL_SERVER_ERROR use showToastOnce
// BAD_USER_INPUT is handled per-mutation — no global toast
// UNAUTHENTICATED triggers client.clearStore() + redirect to /login
```

### MUI Theme Usage
- Primary color: `#0f766e` (teal-700)
- Button `textTransform: 'none'` and `fontWeight: 600` applied globally
- `borderRadius: 8` set globally on `shape`

### Layout Pattern
- `AdminLayout` = AppHeader + AdminSidebar + main content
- `ViewerLayout` = AppHeader + ViewerSidebar + main content
- `APPBAR_HEIGHT = 64` constant defined in each layout file and its sidebar

---

## Security Checklist
- [ ] HttpOnly cookie for JWT — no localStorage
- [ ] `secure: true` in production (env-conditional, evaluated at call time)
- [ ] `sameSite: 'lax'` on auth cookie
- [ ] `credentials: 'include'` on Apollo httpLink
- [ ] CORS restricted to `http://localhost:5173` (update for production)
- [ ] Passwords hashed with bcrypt (cost factor 10)
- [ ] SQL via parameterized prepared statements only
- [ ] Zod validation on all mutation inputs (both backend and frontend)
- [ ] `requireAdmin` guard on all CRUD and audit mutations
- [ ] GraphQLError with appropriate code for all failures
- [ ] Apollo errorLink clears store before redirecting on auth failure
- [ ] JWT_SECRET validated at startup (min 16 chars via Zod envSchema)
- [ ] JWT_SECRET must be rotated before production deployment
- [ ] No delete of core entity data (studies/sites/examiners/users) — junction unassign only
- [ ] Study status transitions enforced server-side (S1–S9, D1–D9) — UI restrictions are defence-in-depth only
- [ ] Pagination capped at pageSize ≤ 100 via paginationSchema in all list resolvers

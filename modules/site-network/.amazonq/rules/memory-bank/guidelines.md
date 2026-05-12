# Development Guidelines

## Code Quality Standards

### TypeScript
- `strict: true` enforced in both packages — no implicit `any`, no loose nulls
- Explicit return types on all exported functions
- Interfaces over type aliases for object shapes (`UserRow`, `StudyRow`, `SiteRow`, `ExaminerRow`, `ExaminerCertificateRow`, `RefreshTokenRow`, `AuditLogRow`, `GraphQLContext`)
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
Request → app.ts (helmet, requestId, morgan/winston logging, JWT cookie extraction, role decoded into context)
  → Apollo resolver (requireAuth / requireAdmin via helpers.ts)
    → parseOrThrow(zodSchema, input)  ← Zod validation
      → service function (business logic + domain rules)
        → repository function (raw SQL via db/query.ts helpers)
          → better-sqlite3 (synchronous)
```
- Resolvers never touch the DB directly — always go through a service
- Services contain only business logic — all raw SQL lives in `repositories/`
- Repositories never import from services — one-way dependency
- `getDb()` singleton — call it inside functions, never at module load time
- `createLoaders()` called per-request in Apollo context — DataLoaders prevent N+1 on type field resolvers

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
logAudit(context, 'CREATE' | 'UPDATE' | 'ASSIGN' | 'UNASSIGN', entityType, entityId, beforeJson, afterJson)
```
- Called from every admin mutation resolver — including CREATE, UPDATE, ASSIGN, and UNASSIGN operations
- Junction-table assign/unassign mutations ARE logged with action `ASSIGN` / `UNASSIGN` and entityType like `StudySite`, `SiteExaminer`, `StudySiteExaminer`
- `logAudit` reads actor email from `context.user.email` (JWT payload) — no extra DB lookup needed
- `audit_logs` table action CHECK constraint includes `('CREATE','UPDATE','ASSIGN','UNASSIGN')`
- Migration shim in `migrate.ts` recreates the audit_logs table if the old CHECK constraint rejects ASSIGN

### Audit Log Entity Types
| entityType | Logged for |
|---|---|
| `Study` | createStudy, updateStudy |
| `Site` | createSite, updateSite |
| `Examiner` | createExaminer, updateExaminer |
| `StudySite` | assignSiteToStudy, unassignSiteFromStudy |
| `SiteExaminer` | assignExaminerToSite, unassignExaminerFromSite |
| `StudySiteExaminer` | assignExaminerToStudySite, unassignExaminerFromStudySite |
| `ExaminerCertificate` | addExaminerCertificate (CREATE), updateExaminerCertificate (UPDATE) |

### Entity Audit History — Related Entity Types
When viewing audit history for a specific entity, the frontend queries multiple related entityTypes to show a complete picture:
```typescript
const RELATED_ENTITY_TYPES: Record<string, string[]> = {
  Study: ['Study', 'StudySite', 'StudySiteExaminer'],
  Site: ['Site', 'SiteExaminer'],
  Examiner: ['Examiner', 'ExaminerCertificate'],
};
```
- `EntityAuditHistoryPage` and `EntityAuditLogDialog` both use `entityTypes` array variable (not single `entityType`)
- Backend `getAuditLogs` resolver supports both `entityType` (single) and `entityTypes` (array) — array takes priority

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
| SI1 | Cannot assign a non-Active site to a study (only Active sites allowed) | `studyService.assignSiteToStudy` |
| SI2 | Cannot unassign a site from a study if SSE rows exist for that pair | `studyService.unassignSiteFromStudy` |
| SI3 | Cannot assign an examiner to a `Closed` site | `siteService.assignExaminerToSite` |
| SI4 | Cannot unassign an examiner from a site if they appear in SSE for that site | `siteService.unassignExaminerFromSite` |
| SI5 | SSE assignment requires (study,site) in `study_sites` AND (site,examiner) in `site_examiners` AND site not Closed | `studyService.assignExaminerToStudySite` |
| SI6 | `assignExaminerToSite` requires examiner has ≥1 valid (non-expired) certificate | `siteService.assignExaminerToSite` via `hasValidCertificate()` |
| SI7 | `assignExaminerToStudySite` requires examiner has ≥1 valid certificate; auto-selects latest if no `certificateId` provided; explicit `certificateId` validated for ownership + expiry | `studyService.assignExaminerToStudySite` |

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
- `nextAllowedSiteStatus()` in `siteSchemas.ts`: Planned→Active, Active→Closed, Closed→null

### CRUD Dialog Stepper Pattern
All create/edit dialogs use a 2-step MUI Stepper:
- Studies: Create (Identity → Schedule), Edit (Details → Schedule)
- Sites: Create (Identity → Location), Edit (Details → Location)
- Examiners: Create (Identity → Contact), Edit (Profile → Contact)
- Step validation via `trigger()` before advancing; error-aware step navigation on server errors

### GQL Documents in Service Files
- All `gql` tagged template literals live in `services/` files — never in components or hooks
- Mutations always in `adminService.ts`; queries in domain service files
- `GLOBAL_SEARCH_QUERY` lives in `services/searchService.ts`

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
- `EntityAuditHistoryPage` is a shared full-page component accepting `entityType`, `backLabel`, `entityLabel` props
- Thin wrappers `StudyAuditHistoryPage`, `SiteAuditHistoryPage`, `ExaminerAuditHistoryPage` are truly minimal — no entity fetching, just pass `entityType` + `backLabel`
- Uses `useParams` to get `id`, `useSearchParams` to persist `page`/`pageSize` in URL (same replace:true pattern as `useUrlPagination`)
- Uses MUI `Table` + `TablePagination` (not DataGrid) — same pattern as `AuditLogsPage`
- Accordion expand: only one row open at a time (`expandedRow` state holds single string id)
- Back navigation uses `navigate(-1)` — restores browser history correctly
- `EntityAuditLogDialog` is an alternative modal variant (non-paginated, `page:1 pageSize:100`) used inline from detail pages
- Both share `fieldLabel()`, `parseJson()`, `diffObjects()` from `utils/auditDiff.ts`
- Routes: `/admin/studies/:id/history`, `/admin/sites/:id/history`, `/admin/examiners/:id/history`
- Both use `RELATED_ENTITY_TYPES` map to query related junction audit entries alongside the main entity

### GET_AUDIT_LOGS_QUERY Signature
```typescript
// adminService.ts — supports both paginated full-page and entity-scoped queries
GET_AUDIT_LOGS_QUERY variables: { entityType?, entityTypes?, entityId?, page?, pageSize? }
// Returns: { total, rows: AuditLog[] }
// AuditLogsPage (global) passes entityType (single); EntityAuditHistoryPage passes entityTypes (array) + entityId
```

### AuditLogsPage Pattern (Global)
- Uses MUI `Table` + `TablePagination` (not DataGrid) for full control over expandable rows
- Entity type filter dropdown (`Study` / `Site` / `Examiner` / `StudySite` / `SiteExaminer` / `StudySiteExaminer` / All) resets page on change
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
- Lives in `components/study/StudySitePanel.tsx`; exported via `components/study/index.ts` barrel
- Per-site checkbox panel showing available examiners (from `site_examiners`) vs assigned (from `study_site_examiners`)
- Each checkbox toggle calls `ASSIGN_EXAMINER_TO_STUDY_SITE` or `UNASSIGN_EXAMINER_FROM_STUDY_SITE`
- `CertificatePickerDialog` (in `components/study/CertificatePickerDialog.tsx`) shown when assigning an examiner with ≥1 valid cert — user selects which cert to link; if no valid certs, backend rejects with `BAD_USER_INPUT`
- Assigned examiner cards show the linked certificate ID + expiry inline
- `refetchQuery` passed as prop to avoid closure over stale `id`
- `readOnly` prop set to `true` for Completed studies — shows lock banner + disables checkboxes
- Closed sites show a message instead of checkboxes
- Viewer equivalent (`ViewerStudySitePanel`) is read-only; only renders sites with `examiners.length > 0`
- Study detail page header includes a "History" button linking to `/admin/studies/:id/history`

### Certificate Management Pattern (Admin Examiner Detail)
- `AdminExaminerDetailPage` includes a Certificates section: MUI Table showing `certificateId`, `expiresOn`, Valid/Expired chip
- `AddCertificateDialog`: react-hook-form + `createCertificateSchema` (frontend Zod) — fields: `certificateId`, `expiresOn` (date input)
- `EditCertificateDialog`: react-hook-form + `updateCertificateSchema` — Save disabled when `!isDirty`
- Both dialogs refetch `GET_EXAMINER_QUERY` on success
- `isCertValid(expiresOn)` helper in `utils/shared.ts`: `expiresOn >= today` (ISO date string comparison)
- `stepperSx` constant in `utils/shared.ts`: shared MUI Stepper styles used by all CRUD dialogs

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
- Font family: `'Poppins', system-ui, -apple-system, sans-serif`
- Table head cells: `fontWeight: 700, backgroundColor: '#f8fafc'`

### Layout Pattern
- `AdminLayout` = AppHeader + AdminSidebar + main content
- `ViewerLayout` = AppHeader + ViewerSidebar + main content
- `APPBAR_HEIGHT = 64` constant defined in each layout file and its sidebar

---

## Security Checklist
- [x] HttpOnly cookie for JWT access token (15m) — no localStorage
- [x] HttpOnly cookie for refresh token (7d, opaque, SHA-256 hashed in DB) — no localStorage
- [x] Refresh token rotation: each use revokes old token, issues new one; `replaced_by_token_hash` audit chain
- [x] `refreshSession` mutation: transparent token refresh + retry via Apollo errorLink (single in-flight promise prevents concurrent refresh storms)
- [x] `revokeAllUserRefreshTokens()` available for forced logout / security events
- [x] `secure: true` in production (env-conditional, evaluated at call time)
- [x] `sameSite: 'lax'` on auth cookie
- [x] `credentials: 'include'` on Apollo httpLink
- [x] CORS restricted to `http://localhost:5173` (update for production)
- [x] Passwords hashed with bcrypt (cost factor 10)
- [x] SQL via parameterized prepared statements only
- [x] Zod validation on all mutation inputs (both backend and frontend)
- [x] `requireAdmin` guard on all CRUD and audit mutations
- [x] GraphQLError with appropriate code for all failures
- [x] Rate limiting: graphqlRateLimit (500 req/min per IP), loginRateLimit (20 attempts/15min per IP+email)
- [x] Helmet security headers (CSP disabled in dev, enabled in prod)
- [x] Request ID middleware (UUID per request, X-Request-Id header)
- [x] Winston structured logging + Morgan HTTP request logging
- [x] Apollo introspection disabled in production
- [x] GraphQL INTERNAL_SERVER_ERROR logged server-side; stack traces never sent to client
- [x] Apollo errorLink handles RATE_LIMITED (429), network errors (503/502/504), UNAUTHENTICATED (refresh-and-retry with single shared promise, redirect on failure), FORBIDDEN, INTERNAL_SERVER_ERROR
- [x] errorLink skips refresh when failing op is `RefreshSession` itself (prevents infinite loop)
- [x] JWT_SECRET validated at startup (min 16 chars via Zod envSchema)
- [ ] JWT_SECRET must be rotated before production deployment
- [x] `refresh_tokens` table: no hard deletes; `revoked_at` used to invalidate; full session audit trail preserved
- [x] No delete of core entity data (studies/sites/examiners/users) — junction unassign only
- [x] Study status transitions enforced server-side (S1–S9, D1–D9) — UI restrictions are defence-in-depth only
- [x] Pagination capped at pageSize ≤ 100 via paginationSchema in all list resolvers (≤ 1000 for pickers)

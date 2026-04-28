# Project Structure

## Directory Layout
```
SNA-y2/
├── backend/
│   ├── data/app.db              # SQLite database (auto-created)
│   ├── src/
│   │   ├── server.ts            # Entry point — Zod env validation, DB init, starts Express
│   │   ├── app.ts               # Express + Apollo Server wiring, JWT cookie context
│   │   ├── db/
│   │   │   ├── connection.ts    # better-sqlite3 singleton (getDb / initConnection)
│   │   │   ├── migrate.ts       # Schema + indexes + migration shims + seed data (2 users + 2 examiner certificates seeded when examiners exist)
│   │   │   └── query.ts         # Typed helpers: queryAll<T> / queryOne<T>
│   │   ├── graphql/
│   │   │   ├── schema/
│   │   │   │   ├── index.ts     # Merges all typeDefs arrays
│   │   │   │   ├── auth.ts      # User (with role), AuthPayload, Query.me, Mutation.login/logout
│   │   │   │   ├── study.ts     # Study, StudySite, StudyPage, CreateStudyInput, UpdateStudyInput, CRUD + SSE mutations
│   │   │   │   ├── site.ts      # Site, SitePage, CreateSiteInput, UpdateSiteInput, CRUD + assignment mutations
│   │   │   │   ├── examiner.ts  # Examiner (with role), ExaminerCertificate, ExaminerPage, CRUD mutations + addExaminerCertificate, updateExaminerCertificate
│   │   │   │   ├── search.ts    # SearchResults, SearchFilters input, Query.globalSearch
│   │   │   │   └── audit.ts     # AuditLog type, AuditLogPage, Query.getAuditLogs (supports entityType, entityTypes array, entityId)
│   │   │   └── resolvers/
│   │   │       ├── index.ts     # Merges all Query/Mutation + type resolvers
│   │   │       ├── helpers.ts   # requireAuth, requireAdmin, logAudit (supports CREATE/UPDATE/ASSIGN/UNASSIGN)
│   │   │       ├── auth.ts      # login (with Zod), logout, me resolvers
│   │   │       ├── study.ts     # getStudies(paged), getStudy, createStudy, updateStudy, assign/unassign site (with audit), assignExaminerToStudySite, unassignExaminerFromStudySite (with audit)
│   │   │       ├── site.ts      # getSites(paged), getSite, createSite, updateSite, assign/unassign examiner (with audit)
│   │   │       ├── examiner.ts  # getExaminers(paged), getExaminer, createExaminer, updateExaminer, addExaminerCertificate, updateExaminerCertificate (with audit)
│   │   │       ├── search.ts    # globalSearch with keyword + SearchFilters
│   │   │       └── audit.ts     # getAuditLogs (ADMIN only, supports entityTypes array)
│   │   ├── services/
│   │   │   ├── authService.ts   # loginUser (includes role in JWT), getUserById
│   │   │   ├── studyService.ts  # getStudiesPaged, CRUD, assignSiteToStudy, unassignSiteFromStudy, getStudySitesWithStudyExaminers, assignExaminerToStudySite, unassignExaminerFromStudySite
│   │   │   ├── siteService.ts   # getSitesPaged, CRUD (createSite always Planned, SITE_UPDATE_COLUMNS allowlist, P1/P2 rules), assignExaminerToSite, unassignExaminerFromSite
│   │   │   ├── examinerService.ts # getExaminersPaged, CRUD, getStudiesByExaminer, getSitesByExaminer, getCertificatesByExaminer, getCertificateById, hasValidCertificate, addExaminerCertificate, updateExaminerCertificate
│   │   │   ├── searchService.ts # globalSearch — keyword LIKE queries across all 3 entities with filters
│   │   │   └── auditService.ts  # getAuditLogs — supports entityType/entityTypes array, entityId, ordered DESC
│   │   ├── types/
│   │   │   └── index.ts         # UserRow, StudyRow, SiteRow, ExaminerRow, ExaminerCertificateRow, AuditLogRow, JwtPayload (with role + email), GraphQLContext
│   │   ├── utils/
│   │   │   ├── jwt.ts           # signToken / verifyToken (JWT_SECRET read lazily via getSecret())
│   │   │   └── password.ts      # hashPassword / verifyPassword (bcryptjs, cost 10)
│   │   └── validation/
│   │       ├── index.ts         # Re-exports all schemas + helpers
│   │       ├── helpers.ts       # parseOrThrow, zodErrorToFieldErrors, throwBadUserInput
│   │       ├── envSchema.ts     # Zod env validation (JWT_SECRET min 16 chars, PORT, DB_PATH, NODE_ENV, CORS_ORIGIN)
│   │       ├── authSchemas.ts   # loginSchema (email + password)
│   │       ├── studySchemas.ts  # createStudySchema, updateStudySchema (with date-range superRefine)
│   │       ├── siteSchemas.ts   # createSiteSchema, updateSiteSchema
│   │       ├── examinerSchemas.ts # createExaminerSchema, updateExaminerSchema, createCertificateSchema, updateCertificateSchema
│   │       └── assignmentSchemas.ts # assignmentSchema, idSchema, siteExaminerSchema, studySiteExaminerSchema, paginationSchema, pickerPaginationSchema, searchSchema
│   ├── .env                     # PORT=4040, JWT_SECRET, DB_PATH
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── assets/favicon.png
    │   ├── components/
    │   │   ├── admin/
    │   │   │   ├── AdminLayout.tsx    # AppHeader + AdminSidebar + main content
    │   │   │   └── AdminSidebar.tsx   # Collapsible drawer: Dashboard/Studies/Sites/Examiners/Search/Audit Logs
    │   │   ├── shared/
    │   │   │   ├── ViewerLayout.tsx   # AppHeader + ViewerSidebar + main content
    │   │   │   └── ViewerSidebar.tsx  # Collapsible drawer: Dashboard/Studies/Sites/Examiners/Search
    │   │   ├── skeletons/
    │   │   │   ├── DashboardSkeleton.tsx  # Loading skeleton for dashboard (stat cards, charts, recent studies, country list)
    │   │   │   ├── DetailPageSkeleton.tsx # Loading skeleton for detail pages (configurable infoFields + relatedSections)
    │   │   │   └── index.ts               # Re-exports DashboardSkeleton, DetailPageSkeleton
    │   │   ├── AdminRoute.tsx         # Auth guard: must be logged in AND role === 'ADMIN'
    │   │   ├── AppFooter.tsx          # Copyright footer
    │   │   ├── AppHeader.tsx          # Fixed AppBar with user avatar + logout
    │   │   ├── DetailPageHeader.tsx   # Back button + title + badge + StatusChip (always uses navigate(-1))
    │   │   ├── EmptyState.tsx         # Dashed-border empty placeholder
    │   │   ├── EntityAuditLogDialog.tsx  # Modal dialog showing paginated change history for a specific entity (before→after diff, uses entityTypes array)
    │   │   ├── Layout.tsx             # Legacy layout (kept for compatibility)
    │   │   ├── ProtectedRoute.tsx     # Auth guard: must be logged in (any role)
    │   │   ├── RelatedDataGrid.tsx    # Title + count chip + DataGrid or EmptyState
    │   │   ├── Sidebar.tsx            # Legacy sidebar (kept for compatibility)
    │   │   ├── StatusChip.tsx         # MUI Chip: Active/Planned/Completed/Closed/Inactive
    │   │   └── TableSkeleton.tsx      # Loading skeleton for DataGrid
    │   ├── contexts/
    │   │   └── AuthContext.tsx        # Derives isLoggedIn + role from ME_QUERY; exposes useAuth()
    │   ├── hooks/
    │   │   ├── admin/                 # (empty — reserved for future admin-specific hooks)
    │   │   ├── shared/                # (empty — reserved for future shared hooks)
    │   │   ├── useLogin.ts            # Login mutation → refetch ME_QUERY → role-based navigate
    │   │   ├── useStudies.ts          # GET_STUDIES_QUERY(page, pageSize) → { studies, total, loading, error }
    │   │   ├── useStudy.ts            # GET_STUDY_QUERY(id) → { study, loading, error }
    │   │   ├── useSites.ts            # GET_SITES_QUERY(page, pageSize) → { sites, total, loading, error }
    │   │   ├── useSite.ts             # GET_SITE_QUERY(id) → { site, loading, error }
    │   │   ├── useExaminers.ts        # GET_EXAMINERS_QUERY(page, pageSize) → { examiners, total, loading, error }
    │   │   ├── useExaminer.ts         # GET_EXAMINER_QUERY(id) → { examiner, loading, error }
    │   │   ├── useSitesPicker.ts      # GET_SITES_PICKER_QUERY (pageSize:1000, minimal fields) for autocomplete
    │   │   ├── useExaminersPicker.ts  # GET_EXAMINERS_PICKER_QUERY (pageSize:1000, minimal fields) for autocomplete
    │   │   └── useUrlPagination.ts    # Persists page+pageSize in URL (?page=N&pageSize=N); used by all admin list pages
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── DashboardPage.tsx      # AdminDashboardPage — charts + stats (including specialty chart), uses DashboardSkeleton
    │   │   │   ├── StudiesPage.tsx        # AdminStudiesPage — server-paginated DataGrid + CreateStudyDialog (2-step) + EditStudyDialog (2-step)
    │   │   │   ├── StudyDetailPage.tsx    # AdminStudyDetailPage — study info + site assign/unassign + per-site examiner checkboxes (StudySitePanel with CertificatePickerDialog) + History button
    │   │   │   ├── StudyAuditHistoryPage.tsx  # Thin wrapper → EntityAuditHistoryPage for Study entity
    │   │   │   ├── SitesPage.tsx          # AdminSitesPage — server-paginated DataGrid + CreateSiteDialog (2-step) + EditSiteDialog (2-step)
    │   │   │   ├── SiteDetailPage.tsx     # AdminSiteDetailPage — site info + examiner assign/unassign autocomplete + History button
    │   │   │   ├── SiteAuditHistoryPage.tsx   # Thin wrapper → EntityAuditHistoryPage for Site entity
    │   │   │   ├── ExaminersPage.tsx      # AdminExaminersPage — server-paginated DataGrid + CreateExaminerDialog (2-step) + EditExaminerDialog (2-step)
    │   │   │   ├── ExaminerDetailPage.tsx # AdminExaminerDetailPage — examiner info + linked studies + sites (read-only) + History button + Certificates table (Add/Edit dialogs with react-hook-form + Zod)
    │   │   │   ├── ExaminerAuditHistoryPage.tsx # Thin wrapper → EntityAuditHistoryPage for Examiner entity
    │   │   │   ├── EntityAuditHistoryPage.tsx   # Shared full-page audit history: MUI Table + TablePagination + accordion expand + URL-persisted pagination + entityTypes array
    │   │   │   ├── SearchPage.tsx         # AdminSearchPage — thin wrapper → shared SearchPage with AdminLayout
    │   │   │   └── AuditLogsPage.tsx      # AuditLogsPage — MUI Table + TablePagination, entity type filter (includes junction types), accordion expand (ADMIN only, fetchPolicy: network-only)
    │   │   ├── viewer/
    │   │   │   ├── DashboardPage.tsx      # ViewerDashboardPage — read-only charts + stats (no specialty chart), uses DashboardSkeleton
    │   │   │   ├── StudiesPage.tsx        # ViewerStudiesPage — server-paginated read-only DataGrid
    │   │   │   ├── StudyDetailPage.tsx    # ViewerStudyDetailPage — study info + sites + per-site examiner breakdown (ViewerStudySitePanel, read-only)
    │   │   │   ├── SitesPage.tsx          # ViewerSitesPage — server-paginated read-only DataGrid
    │   │   │   ├── SiteDetailPage.tsx     # ViewerSiteDetailPage — site info + linked studies + examiners (read-only)
    │   │   │   ├── ExaminersPage.tsx      # ViewerExaminersPage — server-paginated read-only DataGrid
    │   │   │   ├── ExaminerDetailPage.tsx # ViewerExaminerDetailPage — examiner info + linked studies + sites (read-only)
    │   │   │   └── SearchPage.tsx         # ViewerSearchPage — thin wrapper → shared SearchPage with ViewerLayout
    │   │   ├── shared/
    │   │   │   └── SearchPage.tsx         # SearchPage — debounced keyword, entity toggle, context filters, useLazyQuery, filter-only search support
    │   │   └── (legacy flat pages kept for compatibility: DashboardPage, StudyPage, SitePage, ExaminerPage, StudyDetailPage, SiteDetailPage, ExaminerDetailPage, LoginPage)
    │   ├── services/
    │   │   ├── authService.ts       # ME_QUERY (includes role), LOGIN_MUTATION, LOGOUT_MUTATION
    │   │   ├── studyService.ts      # GET_STUDIES_QUERY (paginated), GET_STUDY_QUERY (with studySites/examiners/sites), GET_SITES_PICKER_QUERY
    │   │   ├── siteService.ts       # GET_SITES_QUERY (paginated), GET_SITE_QUERY (with relations), GET_EXAMINERS_PICKER_QUERY
    │   │   ├── examinerService.ts   # GET_EXAMINERS_QUERY (paginated), GET_EXAMINER_QUERY (with studies + sites + certificates)
    │   │   ├── searchService.ts     # GLOBAL_SEARCH_QUERY (keyword + filters → studies/sites/examiners)
    │   │   └── adminService.ts      # All mutations (CREATE/UPDATE/ASSIGN/UNASSIGN for studies, sites, examiners, SSE + ADD_EXAMINER_CERTIFICATE_MUTATION, UPDATE_EXAMINER_CERTIFICATE_MUTATION), GET_AUDIT_LOGS_QUERY (supports entityTypes array)
    │   ├── types/index.ts           # Study (with studySites?), StudySite, StudySiteExaminer (with certificate?), Site, Examiner (with certificates?), ExaminerCertificate, AuditLog, AuditLogPage, AuthContextValue (with role)
    │   ├── utils/
    │   │   ├── apolloClient.ts      # ApolloClient with errorLink (UNAUTHENTICATED → /login, FORBIDDEN toast, INTERNAL_SERVER_ERROR toast) + httpLink
    │   │   ├── auditDiff.ts         # FIELD_LABELS, fieldLabel(), parseJson(), diffObjects(), summaryText() — shared by AuditLogsPage + EntityAuditHistoryPage + EntityAuditLogDialog
    │   │   └── gqlErrors.ts         # parseGqlError — extracts code, message, fieldErrors from ApolloError
    │   ├── validation/
    │   │   ├── index.ts             # Re-exports all frontend schemas
    │   │   ├── authSchemas.ts       # loginSchema, LoginFormValues
    │   │   ├── studySchemas.ts      # createStudySchema, updateStudySchema (date-range refine), nextAllowedStatus(), todayLocal()
    │   │   ├── siteSchemas.ts       # createSiteSchema, updateSiteSchema, nextAllowedSiteStatus()
    │   │   └── examinerSchemas.ts   # createExaminerSchema, updateExaminerSchema, createCertificateSchema, updateCertificateSchema, CreateCertificateFormValues, UpdateCertificateFormValues
    │   ├── App.tsx                  # Router: /admin/* (AdminRoute) + /viewer/* (ProtectedRoute) + legacy redirects
    │   ├── main.tsx                 # React DOM entry point (wraps with SnackbarProvider)
    │   ├── theme.ts                 # MUI theme (teal palette, borderRadius 8, Poppins font, button overrides)
    │   └── vite-env.d.ts
    ├── .env                         # VITE_GRAPHQL_URL=http://localhost:4040/graphql
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

## Route Structure
```
/login                          → LoginPage (public)

/admin/dashboard                → AdminRoute → AdminDashboardPage
/admin/studies                  → AdminRoute → AdminStudiesPage (CRUD)
/admin/studies/:id              → AdminRoute → AdminStudyDetailPage (assign sites, SSE checkboxes)
/admin/studies/:id/history      → AdminRoute → StudyAuditHistoryPage
/admin/sites                    → AdminRoute → AdminSitesPage (CRUD)
/admin/sites/:id                → AdminRoute → AdminSiteDetailPage (assign examiners)
/admin/sites/:id/history        → AdminRoute → SiteAuditHistoryPage
/admin/examiners                → AdminRoute → AdminExaminersPage (CRUD)
/admin/examiners/:id            → AdminRoute → AdminExaminerDetailPage
/admin/examiners/:id/history    → AdminRoute → ExaminerAuditHistoryPage
/admin/search                   → AdminRoute → AdminSearchPage
/admin/audit-logs               → AdminRoute → AuditLogsPage

/viewer/dashboard               → ProtectedRoute → ViewerDashboardPage
/viewer/studies                 → ProtectedRoute → ViewerStudiesPage
/viewer/studies/:id             → ProtectedRoute → ViewerStudyDetailPage
/viewer/sites                   → ProtectedRoute → ViewerSitesPage
/viewer/sites/:id               → ProtectedRoute → ViewerSiteDetailPage
/viewer/examiners               → ProtectedRoute → ViewerExaminersPage
/viewer/examiners/:id           → ProtectedRoute → ViewerExaminerDetailPage
/viewer/search                  → ProtectedRoute → ViewerSearchPage

/dashboard, /studies, etc.      → Legacy redirects → /viewer/* equivalents
/*                              → Navigate to /login
```

## Data Model (SQLite)
```
users           id, email, password, role CHECK('ADMIN','VIEWER')
studies         id, protocolId UNIQUE, title, sponsor, phase, startDate, endDate,
                status CHECK('Planned','Active','Completed'), description
sites           id, siteCode UNIQUE, name, city, country,
                status CHECK('Planned','Active','Closed')
examiners       id, examinerCode UNIQUE, name, specialty, email,
                role CHECK('Principal Investigator','Sub-Investigator'), status
examiner_certificates  id, examiner_id FK, certificateId TEXT, expiresOn TEXT, UNIQUE(examiner_id, certificateId)
study_sites     study_id FK, site_id FK  (M:M)
site_examiners  site_id FK, examiner_id FK  (M:M)
study_site_examiners  study_id FK, site_id FK, examiner_id FK, certificate_id FK  (3-way junction + cert, PK on study_id+site_id+examiner_id, ON DELETE RESTRICT)
audit_logs      id, actorUserId, actorEmail, action CHECK('CREATE','UPDATE','ASSIGN','UNASSIGN'),
                entityType, entityId, beforeJson, afterJson, createdAt DEFAULT datetime('now')

Indexes: studies(title,sponsor,status,phase), sites(name,city,country,status),
         examiners(name,role), audit_logs(actorUserId), audit_logs(entityType,entityId),
         study_site_examiners(study_id,site_id), study_site_examiners(examiner_id),
         examiner_certificates(examiner_id), examiner_certificates(expiresOn)
```

## Data Flow
```
Login → useLogin → GQL mutation login
  → backend sets HttpOnly cookie (auth_token) with role+email in JWT
  → client.refetchQueries([ME_QUERY]) → AuthContext.isLoggedIn=true, role='ADMIN'|'VIEWER'
  → navigate to /admin/dashboard or /viewer/dashboard based on role

Admin CRUD (e.g. createStudy):
  → AdminStudiesPage form (2-step Stepper) → react-hook-form + Zod validation (frontend)
  → CREATE_STUDY_MUTATION → backend resolver
  → requireAdmin(context) → parseOrThrow(createStudySchema, input) (backend Zod)
  → createStudy service → INSERT + return new row
  → logAudit(context, 'CREATE', 'Study', id, null, afterJson)
  → refetchQueries([GET_STUDIES_QUERY]) → DataGrid updates

Assignment (e.g. assignSiteToStudy):
  → AdminStudyDetailPage Autocomplete → ASSIGN_SITE_TO_STUDY mutation
  → requireAdmin → parseOrThrow(assignmentSchema) → assignSiteToStudy service
  → INSERT OR IGNORE into study_sites
  → logAudit(context, 'ASSIGN', 'StudySite', studyId, null, {studyId, siteId})
  → refetchQueries([GET_STUDY_QUERY]) → RelatedDataGrid updates

SSE Assignment (assignExaminerToStudySite):
  → AdminStudyDetailPage StudySitePanel checkbox toggle
  → ASSIGN_EXAMINER_TO_STUDY_SITE mutation
  → requireAdmin → parseOrThrow(studySiteExaminerSchema)
  → validates (study,site) in study_sites AND (site,examiner) in site_examiners AND site not Closed
  → CertificatePickerDialog shown if examiner has ≥1 valid cert; user selects cert (or auto-selected if only one)
  → ASSIGN_EXAMINER_TO_STUDY_SITE mutation (with optional certificateId)
  → requireAdmin → parseOrThrow(studySiteExaminerSchema)
  → validates (study,site) in study_sites AND (site,examiner) in site_examiners AND site not Closed
  → resolves certificate: explicit if provided, else auto-picks latest valid cert; rejects if none valid
  → INSERT OR IGNORE into study_site_examiners (with certificate_id)
  → logAudit(context, 'ASSIGN', 'StudySiteExaminer', studyId, null, {studyId, siteId, examinerId, certificateId})
  → refetchQueries([GET_STUDY_QUERY]) → StudySitePanel re-renders (shows cert info on assigned examiner)

Search:
  → SearchPage keyword input → debounced 400ms → useLazyQuery(GLOBAL_SEARCH_QUERY)
  → globalSearch service → LIKE queries on studies/sites/examiners with optional filters
  → Results grouped by entity type, clickable → navigate to detail page
  → Filter-only search (no keyword) sends '%%' to satisfy backend min(2) validation

Apollo errorLink:
  → UNAUTHENTICATED → client.clearStore() → window.location.href = '/login'
  → FORBIDDEN → showToastOnce (deduplicated within 3s)
  → INTERNAL_SERVER_ERROR → showToastOnce + console.error
  → BAD_USER_INPUT → handled per-mutation in component (no global toast)
```

## Architectural Patterns
- Monorepo: two independent npm packages (`backend/`, `frontend/`)
- GraphQL as sole API layer — no REST endpoints except `/health`
- Role-based access: `requireAuth` for any logged-in user, `requireAdmin` for ADMIN-only operations
- Auth via HttpOnly cookie (`auth_token`) with `role` + `email` in JWT payload — never localStorage
- SQLite via `better-sqlite3` (synchronous) — no ORM, raw SQL with typed helpers
- Zod validation on both sides: backend `parseOrThrow` in resolvers, frontend `zodResolver` in react-hook-form
- Server-side pagination: all list queries return `{ rows, total }` page objects
- Detail pages use dedicated single-entity queries (`GET_STUDY_QUERY`) — not derived from list cache
- Picker hooks (`useSitesPicker`, `useExaminersPicker`) fetch all records with `pageSize:1000` for autocomplete
- Shared `SearchPage` component accepts `layout` + `baseRoute` props — reused by both Admin and Viewer
- `logAudit` helper in `helpers.ts` called from every admin mutation resolver (CREATE, UPDATE, ASSIGN, UNASSIGN)
- Domain rules enforced in services (e.g. site cannot be Active without examiners; auto-downgrade on last unassign)
- `study_site_examiners` (SSE) 3-way junction + `certificate_id`: tracks which examiners participate in a study at a specific site, linked to the certificate used at assignment time
- `examiner_certificates` table: each examiner can have multiple certificates; `hasValidCertificate` checked before assigning to site or study; `assignExaminerToSite` and `assignExaminerToStudySite` both enforce valid cert
- `CertificatePickerDialog` in `StudyDetailPage`: shown when assigning an examiner with ≥1 valid cert; allows explicit cert selection
- `AdminExaminerDetailPage` has full certificate management: table showing Valid/Expired status chips, Add Certificate dialog, Edit Certificate dialog
- Audit entity type `ExaminerCertificate` logged for `addExaminerCertificate` (CREATE) and `updateExaminerCertificate` (UPDATE)
- `getStudySitesWithStudyExaminers` uses bulk queries + in-memory grouping to avoid N+1 for SSE data
- `getExaminersByStudy` prefers SSE rows; falls back to `site_examiners` join for legacy/pre-SSE data
- Apollo errorLink deduplicates FORBIDDEN/INTERNAL_SERVER_ERROR toasts within a 3-second window
- Admin dashboard fetches all data with `pageSize:1000`; viewer dashboard omits specialty chart
- `DashboardSkeleton` and `DetailPageSkeleton` (configurable `infoFields` + `relatedSections`) used across all detail/dashboard pages
- `useUrlPagination` hook persists page+pageSize in URL query params — used by all admin list pages so back button restores exact pagination state
- `AuditLogsPage` uses MUI `Table`+`TablePagination` (not DataGrid) for accordion-style expandable rows with inline diff panels
- `utils/auditDiff.ts` centralises `FIELD_LABELS`, `diffObjects`, `summaryText` — shared by `AuditLogsPage`, `EntityAuditHistoryPage`, and `EntityAuditLogDialog`
- Edit dialogs disable Save button when `!isDirty` (react-hook-form `formState.isDirty`)
- Study detail page header includes a "History" button navigating to `/admin/studies/:id/history`
- All CRUD dialogs use 2-step MUI Stepper pattern for better UX
- Completed studies show a lock banner and disable all assignment operations

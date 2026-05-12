# Project Structure

## Directory Layout
```
SNA-y2/
├── docs/
│   ├── auth.md                  # Comprehensive auth & session management documentation (dual-token flow, rotation, security notes, manual test checklist)
│   └── TESTING.md               # Testing guide: run commands, coverage targets, test inventory per file, architecture notes, what remains and why
├── e2e/
│   ├── admin-workflow.spec.ts   # Playwright: create study/site/examiner, add certificate, audit logs page
│   ├── refresh-smoke.spec.ts    # Playwright: clear auth_token → verify refresh or redirect
│   └── viewer-smoke.spec.ts     # Playwright: login as viewer, navigate studies, verify read-only
├── playwright.config.ts         # Playwright config: chromium, webServer for backend+frontend, 60s timeout
├── playwright.slow.config.ts    # Extends playwright.config: headless:false + slowMo:500 (demo mode)
├── package.json                 # Root package: @playwright/test devDep, test:e2e scripts
├── backend/
│   ├── data/app.db              # SQLite database (auto-created)
│   ├── src/
│   │   ├── server.ts            # Entry point — Zod env validation, DB init, starts Express
│   │   ├── app.ts               # Express + Apollo Server wiring, JWT cookie context, security middleware, DataLoader per request
│   │   ├── db/
│   │   │   ├── connection.ts    # better-sqlite3 singleton (getDb / initConnection)
│   │   │   ├── migrate.ts       # Schema + indexes + migration shims + seed data (2 users + 2 examiner certificates seeded when examiners exist)
│   │   │   └── query.ts         # Typed helpers: queryAll<T> / queryOne<T>
│   │   ├── graphql/
│   │   │   ├── loaders/
│   │   │   │   └── index.ts     # DataLoader factory (createLoaders): studyById, siteById, examinerById + relation loaders for N+1 prevention
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
│   │   │       ├── helpers.ts   # requireAuth, requireAdmin, logAudit — logAudit now calls insertAuditLog from auditRepository
│   │   │       ├── auth.ts      # login (with Zod), logout, me resolvers
│   │   │       ├── study.ts     # getStudies(paged), getStudy, createStudy, updateStudy, assign/unassign site (with audit), assignExaminerToStudySite, unassignExaminerFromStudySite (with audit)
│   │   │       ├── site.ts      # getSites(paged), getSite, createSite, updateSite, assign/unassign examiner (with audit)
│   │   │       ├── examiner.ts  # getExaminers(paged), getExaminer, createExaminer, updateExaminer, addExaminerCertificate, updateExaminerCertificate (with audit)
│   │   │       ├── search.ts    # globalSearch with keyword + SearchFilters
│   │   │       └── audit.ts     # getAuditLogs (ADMIN only, supports entityTypes array)
│   │   ├── logger/
│   │   │   ├── logger.ts        # Winston logger (JSON in prod, colorized in dev); LOG_LEVEL env var
│   │   │   └── requestLogger.ts # Morgan HTTP request logger piped into Winston
│   │   ├── middleware/
│   │   │   ├── requestId.ts     # Attaches UUID requestId to req + X-Request-Id response header
│   │   │   └── security.ts      # helmet, graphqlRateLimit (500 req/min), loginRateLimit (20/15min per IP+email)
│   │   ├── repositories/
│   │   │   ├── auditRepository.ts      # insertAuditLog, queryAuditLogs
│   │   │   ├── authRepository.ts       # findUserByEmail, findUserById
│   │   │   ├── certificateRepository.ts # findCertificatesByExaminerId, findCertificateById, countValidCertificates, insert/update certificate
│   │   │   ├── examinerRepository.ts   # findExaminerById/Paged, insert/update examiner, findExaminersByIds (DataLoader)
│   │   │   ├── refreshTokenRepository.ts  # insertRefreshToken, findRefreshToken, revokeRefreshToken (with replacement hash), revokeAllUserRefreshTokens
│   │   │   ├── searchRepository.ts     # searchStudies, searchSites, searchExaminers (LIKE queries)
│   │   │   ├── siteRepository.ts       # findSiteById/Paged, insert/update site, site-examiner junction ops, findSitesByIds (DataLoader)
│   │   │   └── studyRepository.ts      # findStudyById/Paged, insert/update study, study-site/SSE junction ops, bulk SSE queries, findStudiesByIds (DataLoader)
│   │   ├── services/
│   │   │   ├── authService.ts   # loginUser (includes role in JWT, returns dual tokens), refreshSession (rotation), revokeSession, getUserById
│   │   │   ├── studyService.ts  # getStudiesPaged, CRUD, assignSiteToStudy, unassignSiteFromStudy, getStudySitesWithStudyExaminers, assignExaminerToStudySite, unassignExaminerFromStudySite
│   │   │   ├── siteService.ts   # getSitesPaged, CRUD (createSite always Planned, P1/P2 rules), assignExaminerToSite, unassignExaminerFromSite
│   │   │   ├── examinerService.ts # getExaminersPaged, CRUD, getCertificatesByExaminer, getCertificateById, hasValidCertificate, addExaminerCertificate, updateExaminerCertificate
│   │   │   ├── searchService.ts # globalSearch — delegates to searchRepository
│   │   │   └── auditService.ts  # getAuditLogs — delegates to auditRepository; supports entityType/entityTypes array, entityId
│   │   ├── types/
│   │   │   └── index.ts         # UserRow, StudyRow, SiteRow, ExaminerRow, ExaminerCertificateRow, RefreshTokenRow, AuditLogRow, JwtPayload (with role + email), GraphQLContext (now includes requestId + loaders)
│   │   ├── utils/
│   │   │   ├── jwt.ts           # signToken / verifyToken (JWT_SECRET read lazily via getSecret())
│   │   │   ├── password.ts      # hashPassword / verifyPassword (bcryptjs, cost 10)
│   │   │   └── token.ts         # generateRefreshToken (48-byte hex), hashToken (SHA-256) — used by authService for refresh token rotation
│   │   ├── validation/
│   │   │   ├── index.ts         # Re-exports all schemas + helpers
│   │   │   ├── helpers.ts       # parseOrThrow, zodErrorToFieldErrors, throwBadUserInput
│   │   │   ├── envSchema.ts     # Zod env validation (JWT_SECRET min 16 chars, PORT, DB_PATH, NODE_ENV, CORS_ORIGIN)
│   │   │   ├── authSchemas.ts   # loginSchema (email + password)
│   │   │   ├── studySchemas.ts  # createStudySchema, updateStudySchema (with date-range superRefine)
│   │   │   ├── siteSchemas.ts   # createSiteSchema, updateSiteSchema
│   │   │   ├── examinerSchemas.ts # createExaminerSchema, updateExaminerSchema, createCertificateSchema, updateCertificateSchema
│   │   │   └── assignmentSchemas.ts # assignmentSchema, idSchema, siteExaminerSchema, studySiteExaminerSchema, paginationSchema, pickerPaginationSchema, searchSchema
│   │   └── __tests__/
│   │       ├── integration/
│   │       │   ├── graphql.test.ts           # Integration tests via supertest: RBAC, createStudy, BAD_USER_INPUT, UNAUTHENTICATED, /health
│   │       │   ├── graphqlExpanded.test.ts   # Expanded integration: RBAC (site/examiner/audit), Zod validation, audit log creation (CREATE/UPDATE/ASSIGN/UNASSIGN), refresh token flow, expired cert, globalSearch, entityTypes array
│   │       │   ├── graphqlRefresh.test.ts    # Integration: login cookie validation, refreshSession rotation/revoked/garbage/replay-attack, UNAUTHENTICATED on protected queries
│   │       │   └── graphqlSearch.test.ts     # Integration: globalSearch keyword matching, validation (min 2 chars, %% filter-only), entityType filter, domain filters (phase/role/country), auth required
│   │       ├── unit/
│   │       │   ├── auditService.test.ts           # Unit tests: getAuditLogs queries/filters/pagination, insertAuditLog field storage + action types
│   │       │   ├── authService.test.ts            # Unit tests: loginUser success/failure, hashed token storage, refresh TTL, refreshSession rotation/revoked/expired, revokeSession
│   │       │   ├── certificateService.test.ts     # Unit tests: addExaminerCertificate (success, duplicate, cross-examiner, non-existent), updateExaminerCertificate (expiresOn, certificateId, conflict, not-found, no-op), hasValidCertificate (no cert, expired, today boundary, valid), getCertificatesByExaminer ordering
│   │       │   ├── examinerService.test.ts        # Unit tests: hasValidCertificate, duplicate cert, cross-examiner cert, updateCertificate conflict, getCertificatesByExaminer ordering
│   │       │   ├── refreshTokenRepository.test.ts # Unit tests: insert/find, revokeRefreshToken (with/without replacement), revokeAllUserRefreshTokens (scoped, idempotent)
│   │       │   ├── resolverHelpers.test.ts        # Unit tests: requireAuth (null→UNAUTHENTICATED, user→pass), requireAdmin (null→UNAUTHENTICATED, VIEWER→FORBIDDEN, ADMIN→pass), logAudit (UPDATE/CREATE/ASSIGN/UNASSIGN field storage)
│   │       │   ├── searchService.test.ts           # Unit tests: keyword matching (title/sponsor/name/specialty), entityType filter, domain filters (status/phase/city/country/role), %% wildcard
│   │       │   ├── siteService.test.ts             # Unit tests: P3 create, P1 Active requires examiner, SI3 Closed site, SI6 no valid cert, P2 auto-downgrade
│   │       │   ├── sseIntegrity.test.ts            # Unit tests: SI5a/SI5c prerequisites, SI7 expired/no-valid/auto-select/explicit cert, SI2 unassign blocked by SSE, D7 Closed site blocks activation
│   │       │   └── studyService.test.ts            # Unit tests: S1/D1/D2/S8 create rules, S2/S3/D4/D6/D3 status transitions, SI1 assign Planned site, D9 unassign from Active study
│   │       └── testHelpers.ts   # setupTestDb (in-memory SQLite), seedUser helper
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
    │   │   │   ├── ErrorBoundary.tsx  # React class component: catches render errors, shows fallback UI with "Try again" button
    │   │   │   ├── ViewerLayout.tsx   # AppHeader + ViewerSidebar + main content
    │   │   │   └── ViewerSidebar.tsx  # Collapsible drawer: Dashboard/Studies/Sites/Examiners/Search
    │   │   ├── skeletons/
    │   │   │   ├── DashboardSkeleton.tsx  # Loading skeleton for dashboard (stat cards, charts, recent studies, country list)
    │   │   │   ├── DetailPageSkeleton.tsx # Loading skeleton for detail pages (configurable infoFields + relatedSections)
    │   │   │   └── index.ts               # Re-exports DashboardSkeleton, DetailPageSkeleton
    │   │   ├── study/
    │   │   │   ├── CertificatePickerDialog.tsx  # Dialog to select a valid certificate when assigning examiner to study site
    │   │   │   ├── StudySitePanel.tsx           # Per-site examiner checkbox panel for AdminStudyDetailPage
    │   │   │   └── index.ts                     # Re-exports CertificatePickerDialog, StudySitePanel
    │   │   ├── AdminRoute.tsx         # Auth guard: must be logged in AND role === 'ADMIN'
    │   │   ├── AppFooter.tsx          # Copyright footer
    │   │   ├── AppHeader.tsx          # Fixed AppBar with user avatar + logout
    │   │   ├── DetailPageHeader.tsx   # Back button + title + badge + StatusChip (always uses navigate(-1))
    │   │   ├── EmptyState.tsx         # Dashed-border empty placeholder
    │   │   ├── EntityAuditLogDialog.tsx  # Modal dialog showing paginated change history for a specific entity (before→after diff, uses entityTypes array)
    │   │   ├── InfoField.tsx          # Reusable label+value display component used in detail pages
    │   │   ├── ProtectedRoute.tsx     # Auth guard: must be logged in (any role)
    │   │   ├── RelatedDataGrid.tsx    # Title + count chip + DataGrid or EmptyState
    │   │   ├── StatusChip.tsx         # MUI Chip: Active/Planned/Completed/Closed/Inactive
    │   │   └── TableSkeleton.tsx      # Loading skeleton for DataGrid
    │   ├── contexts/
    │   │   └── AuthContext.tsx        # Derives isLoggedIn + role from ME_QUERY; exposes useAuth()
    │   ├── hooks/
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
    │   └── LoginPage.tsx              # Login form (react-hook-form + Zod, default credentials pre-filled)
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
    │   │   ├── gqlErrors.ts         # parseGqlError — extracts code, message, fieldErrors from ApolloError
    │   │   └── shared.ts            # stepperSx (shared MUI Stepper styles), isCertValid(expiresOn) helper
    │   ├── validation/
    │   │   ├── index.ts             # Re-exports all frontend schemas
    │   │   ├── authSchemas.ts       # loginSchema, LoginFormValues
    │   │   ├── studySchemas.ts      # createStudySchema, updateStudySchema (date-range refine), nextAllowedStatus(), todayLocal()
    │   │   ├── siteSchemas.ts       # createSiteSchema, updateSiteSchema, nextAllowedSiteStatus()
    │   │   └── examinerSchemas.ts   # createExaminerSchema, updateExaminerSchema, createCertificateSchema, updateCertificateSchema, CreateCertificateFormValues, UpdateCertificateFormValues
    │   ├── App.tsx                  # Router: /admin/* (AdminRoute) + /viewer/* (ProtectedRoute) + legacy redirects to /viewer/*
    │   ├── main.tsx                 # React DOM entry point (wraps with SnackbarProvider)
    │   ├── theme.ts                 # MUI theme (teal palette, borderRadius 8, Poppins font, button overrides)
    │   └── vite-env.d.ts
    │   ├── __tests__/
    │   │   ├── integration/
    │   │   │   ├── AdminExaminerDetailPage.test.tsx  # Component test: examiner details, cert table, Add Certificate dialog, mutation + success/error toasts
    │   │   │   ├── AdminSiteDetailPage.test.tsx      # Component test: site details, assigned examiners, linked studies, History button, Assign section, unassign mutation
    │   │   │   ├── AdminSitesPage.test.tsx           # Component test: heading + New Site button, DataGrid rows, Create dialog 2-step (Identity→Location), create mutation + success toast, Planned badge
    │   │   │   ├── AdminStudyDetailPage.test.tsx     # Component test: StudySitePanel checkboxes, CertificatePickerDialog, assign/unassign mutations, Completed lock banner
    │   │   │   ├── AuditLogsPage.test.tsx            # Component test: heading + filter dropdown, audit rows render, expand row shows diff detail, empty state message
    │   │   │   ├── SearchPage.test.tsx               # Component test: idle state, single-char hint, debounce timing, query results, empty state, result count
    │   │   │   ├── ViewerDashboardPage.test.tsx      # Component test: heading, stat cards, chart sections, Recent Studies, Sites by Country, no specialty chart (viewer-only)
    │   │   │   ├── ViewerStudiesPage.test.tsx        # Component test: heading, study rows, read-only (no Create/Edit), row click navigation, error alert
    │   │   │   └── ViewerStudyDetailPage.test.tsx    # Component test: study details, per-site examiner breakdown, no CRUD buttons, no checkboxes, certificate info inline
    │   │   ├── unit/
    │   │   │   ├── AdminRoute.test.tsx               # Unit test: AdminRoute redirects non-admin users
    │   │   │   ├── ErrorBoundary.test.tsx            # Unit test: ErrorBoundary renders fallback on error
    │   │   │   ├── login.smoke.test.tsx              # Smoke test: LoginPage renders and accepts input
    │   │   │   └── ProtectedRoute.test.tsx           # Unit test: ProtectedRoute redirects unauthenticated users
    │   │   └── setup.ts                              # Vitest setup: @testing-library/jest-dom matchers
    ├── .env                         # VITE_GRAPHQL_URL=http://localhost:4040/graphql
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── vitest.config.ts             # Vitest config: jsdom environment, react plugin, coverage on components+pages
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
- `logAudit` helper in `helpers.ts` called from every admin mutation resolver (CREATE, UPDATE, ASSIGN, UNASSIGN); delegates to `insertAuditLog` in `auditRepository`
- Domain rules enforced in services (e.g. site cannot be Active without examiners; auto-downgrade on last unassign)
- `study_site_examiners` (SSE) 3-way junction + `certificate_id`: tracks which examiners participate in a study at a specific site, linked to the certificate used at assignment time
- `examiner_certificates` table: each examiner can have multiple certificates; `hasValidCertificate` checked before assigning to site or study; `assignExaminerToSite` and `assignExaminerToStudySite` both enforce valid cert
- `CertificatePickerDialog` in `components/study/`: shown when assigning an examiner with ≥1 valid cert; allows explicit cert selection; `StudySitePanel` also lives in `components/study/`, both exported via barrel `index.ts`
- `AdminExaminerDetailPage` has full certificate management: table showing Valid/Expired status chips, Add Certificate dialog, Edit Certificate dialog
- Audit entity type `ExaminerCertificate` logged for `addExaminerCertificate` (CREATE) and `updateExaminerCertificate` (UPDATE)
- `getStudySitesWithStudyExaminers` uses bulk queries + in-memory grouping to avoid N+1 for SSE data
- `getExaminersByStudy` prefers SSE rows; falls back to `site_examiners` join for legacy/pre-SSE data
- Apollo errorLink deduplicates FORBIDDEN/INTERNAL_SERVER_ERROR toasts within a 3-second window; also handles RATE_LIMITED (429) and network errors (503/502/504)
- Admin dashboard fetches all data with `pageSize:1000`; viewer dashboard omits specialty chart
- `DashboardSkeleton` and `DetailPageSkeleton` (configurable `infoFields` + `relatedSections`) used across all detail/dashboard pages
- `useUrlPagination` hook persists page+pageSize in URL query params — used by all admin list pages so back button restores exact pagination state
- `AuditLogsPage` uses MUI `Table`+`TablePagination` (not DataGrid) for accordion-style expandable rows with inline diff panels
- `utils/shared.ts` centralises `stepperSx` (MUI Stepper styles) and `isCertValid(expiresOn)` — imported by CRUD dialogs and certificate-related components
- Edit dialogs disable Save button when `!isDirty` (react-hook-form `formState.isDirty`)
- Study detail page header includes a "History" button navigating to `/admin/studies/:id/history`
- All CRUD dialogs use 2-step MUI Stepper pattern for better UX
- Completed studies show a lock banner and disable all assignment operations
- **DataLoader pattern**: `createLoaders()` called per-request in Apollo context; loaders for entity-by-ID and relation fields prevent N+1 queries on list pages
- **Repository layer**: all raw SQL moved from services into `repositories/`; services contain only business logic; resolvers call services only
- **Testing**: Vitest with in-memory SQLite (`setupTestDb`); unit tests for all service domains + authService + auditService + searchService + refreshTokenRepository + sseIntegrity + certificateService + resolverHelpers; integration tests via supertest (graphql.test.ts, graphqlExpanded.test.ts, graphqlRefresh.test.ts, graphqlSearch.test.ts covering RBAC, validation, audit logs, refresh flow, search, entityTypes); frontend Vitest with jsdom + @testing-library/react for component/smoke tests (AdminRoute, ProtectedRoute, ErrorBoundary, login smoke, SearchPage, AdminExaminerDetailPage, AdminStudyDetailPage, AdminSiteDetailPage, AdminSitesPage, AuditLogsPage, ViewerStudiesPage, ViewerStudyDetailPage, ViewerDashboardPage); Playwright E2E tests (admin-workflow, refresh-smoke, viewer-smoke)
- **Test counts**: Backend 14 files / 155 tests; Frontend 13 files / 63 tests; E2E 3 spec files — all passing
- **Coverage config**: Backend covers `services/**`, `repositories/**`, `utils/**`, `graphql/resolvers/**`; Frontend covers `components/**`, `pages/**`, `hooks/**`, `utils/**`; both use `reporter: ['text', 'lcov']`
- **E2E testing**: Playwright at root level — `admin-workflow.spec.ts` (create study/site/examiner, add certificate, audit logs), `refresh-smoke.spec.ts` (auth_token cleared → refresh or redirect), `viewer-smoke.spec.ts` (login, navigate, verify read-only)
- **Documentation**: `docs/auth.md` (dual-token auth flow, rotation, security notes, manual test checklist), `docs/TESTING.md` (test inventory per file, coverage targets, architecture notes, what remains and why)
- **Security hardening**: helmet (CSP disabled in dev), rate limiting (graphqlRateLimit 500/min — 10000 in test env, loginRateLimit 20/15min per IP+email), requestId middleware, Winston structured logging, introspection disabled in production
- **`RELATED_ENTITY_TYPES` for Examiner** now includes `ExaminerCertificate` (in addition to `Examiner`) so certificate audit entries appear in examiner history pages

# Product Overview

## Purpose
SNA Demo is a full-stack clinical study management application demonstrating a modern React + GraphQL + SQLite architecture. It provides role-based authenticated access to a relational clinical data model — studies, sites, and examiners — with separate ADMIN and VIEWER experiences, a rich Material UI interface, and full CRUD + audit trail capabilities.

## Key Features
- JWT-based authentication via HttpOnly cookies — **dual-token strategy**: short-lived access token (15m, `auth_token` cookie) + long-lived refresh token (7d, `refresh_token` cookie, opaque, SHA-256 hashed in DB)
- Transparent token refresh: Apollo errorLink intercepts `UNAUTHENTICATED`, calls `refreshSession` mutation (single in-flight promise for concurrent requests), retries original operation; redirects to `/login` only if refresh fails
- Refresh token rotation: each successful refresh revokes the old token and issues a new one; `replaced_by_token_hash` preserves audit chain
- Role-based routing: ADMIN gets full CRUD + audit logs; VIEWER gets read-only access
- Dashboard with Chart.js visualizations: study status doughnut, phase bar chart, examiner specialty breakdown (admin only), sites-by-country list
- Studies, Sites, and Examiners list pages — server-side paginated MUI DataGrid tables
- Detail pages for each entity showing related data in nested DataGrids
- Admin CRUD: create/edit studies, sites, examiners via react-hook-form + Zod validated 2-step Stepper dialogs
- Admin assignment management: assign/unassign sites to studies, assign/unassign examiners to sites (requires valid certificate), assign/unassign examiners to specific study+site pairs (3-way SSE junction, linked to a certificate)
- Examiner certificate management: add/edit GCP certificates per examiner with expiry tracking; Valid/Expired status shown inline; required before assigning examiner to a site or study
- Study detail page: per-site examiner assignment via checkbox panel (StudySitePanel) — shows available vs assigned examiners per site; certificate picker dialog when assigning; assigned examiner cards show linked cert ID + expiry; Completed studies show lock banner
- Viewer study detail page: read-only per-site examiner breakdown (ViewerStudySitePanel) — only shows sites with assigned examiners
- Comprehensive audit logging — all admin actions (CREATE, UPDATE, ASSIGN, UNASSIGN) recorded with before/after JSON snapshots
- Global audit log page — filterable by entity type (including junction types: StudySite, SiteExaminer, StudySiteExaminer); expandable inline diff rows (accordion, one at a time)
- Per-entity audit history pages — dedicated full-page paginated change history for each Study, Site, and Examiner; includes related junction audit entries
- `EntityAuditLogDialog` — inline modal showing change history for a specific entity (used from detail pages)
- `EntityAuditHistoryPage` — full-page server-paginated audit history with expandable inline diff panels (before→after per field)
- Global search with debounced auto-search, entity type toggle, context-aware filters, and filter-only search support
- Collapsible sidebar navigation (separate Admin and Viewer sidebars)
- Protected routes with `ProtectedRoute` (any auth) and `AdminRoute` (ADMIN role only)
- Global Apollo error link — auto-redirects to `/login` on `UNAUTHENTICATED` errors; deduplicates FORBIDDEN/INTERNAL_SERVER_ERROR toasts
- Health check endpoint (`GET /health`) for backend liveness monitoring
- Zod validation on both backend (server-side) and frontend (form validation via react-hook-form)
- Auto-seeded database with 2 users (ADMIN + VIEWER)
- Loading skeletons for dashboard and detail pages

## Target Users
- Developers learning full-stack GraphQL patterns with React + Apollo
- Teams evaluating a clinical data viewer/editor scaffold with role-based access and audit trails

## Use Cases
1. Log in as VIEWER → read-only dashboard, studies, sites, examiners, search
2. Log in as ADMIN → full CRUD on all entities, assignment management, audit logs
3. Admin creates a study → audit log records the CREATE with afterJson snapshot
4. Admin edits a study → audit log records the UPDATE with before/after JSON
5. Admin assigns a site to a study via autocomplete picker on the study detail page → audit log records ASSIGN with StudySite entityType
6. Admin adds a certificate to an examiner (certificateId + expiresOn) → audit log records CREATE with ExaminerCertificate entityType
7. Admin assigns an examiner to a site — requires examiner has ≥1 valid (non-expired) certificate; site auto-activates when first examiner is assigned
8. Admin assigns an examiner to a study at a specific site via checkbox panel — CertificatePickerDialog shown if multiple valid certs; certificate linked in study_site_examiners → audit log records ASSIGN with StudySiteExaminer entityType
9. Admin unassigns last examiner from an Active site → site auto-downgrades to Planned
10. Search across all entities with keyword + filters; results update as you type (debounced)
11. Admin views per-entity change history at `/admin/studies/:id/history`, `/admin/sites/:id/history`, `/admin/examiners/:id/history` — includes related junction audit entries
12. Completed studies are locked — site and examiner assignments cannot be modified

## Seeded Credentials
| Role   | Email           | Password    |
|--------|-----------------|-------------|
| VIEWER | viewer@test.com | password123 |
| ADMIN  | admin@test.com  | password123 |

## Seeded Data
- 2 Users (ADMIN + VIEWER) — seeded automatically on first run
- 2 Examiner certificates seeded automatically when examiners exist and no certs are present (one valid expiring next year, one expired last year — for the first two examiners by ID)
- Studies, Sites, Examiners, and junction table links are NOT auto-seeded — the database starts empty except for users
- Data must be created manually through the admin interface or by adding seed logic to `migrate.ts`

## Project Completion Status
The project is **fully implemented** — all features described in the README and architecture docs are complete:
- ✅ Backend: all services, resolvers, schemas, validation, auth, audit logging
- ✅ Frontend: all admin pages, viewer pages, CRUD dialogs, search, audit history
- ✅ Domain rules: all study/site lifecycle rules enforced server-side
- ✅ Security: HttpOnly cookies (dual-token: access 15m + refresh 7d), bcrypt, Zod validation, role guards, parameterized SQL, helmet, rate limiting, refresh token rotation with SHA-256 hashing
- ✅ Architecture: repository layer extracted from services; DataLoader per-request for N+1 prevention
- ✅ Testing: Vitest unit tests (studyService, siteService, examinerService, authService, auditService, searchService, refreshTokenRepository, sseIntegrity, certificateService, resolverHelpers) + supertest integration tests (graphql.test.ts, graphqlExpanded.test.ts, graphqlRefresh.test.ts, graphqlSearch.test.ts); in-memory SQLite test DB; frontend Vitest + @testing-library/react component/smoke tests (AdminRoute, ProtectedRoute, ErrorBoundary, login, SearchPage, AdminExaminerDetailPage, AdminStudyDetailPage, AdminSiteDetailPage, AdminSitesPage, AuditLogsPage, ViewerStudiesPage, ViewerStudyDetailPage, ViewerDashboardPage)
- ✅ E2E Testing: Playwright at root level — admin workflow (CRUD + certificate), refresh token smoke, viewer read-only smoke
- ✅ Documentation: `docs/auth.md`, `docs/TESTING.md`, `docs/architecture.md`, `docs/database.md`
- ✅ Observability: Winston structured logging, Morgan HTTP logging, request ID correlation, introspection disabled in prod

# Product Overview

## Purpose
SNA Demo is a full-stack clinical study management application demonstrating a modern React + GraphQL + SQLite architecture. It provides role-based authenticated access to a relational clinical data model — studies, sites, and examiners — with separate ADMIN and VIEWER experiences, a rich Material UI interface, and full CRUD + audit trail capabilities.

## Key Features
- JWT-based authentication via HttpOnly cookies with role claim (`ADMIN` / `VIEWER`)
- Role-based routing: ADMIN gets full CRUD + audit logs; VIEWER gets read-only access
- Dashboard with Chart.js visualizations: study status doughnut, phase bar chart, examiner specialty breakdown, sites-by-country list
- Studies, Sites, and Examiners list pages — server-side paginated MUI DataGrid tables
- Detail pages for each entity showing related data in nested DataGrids
- Admin CRUD: create/edit studies, sites, examiners via react-hook-form + Zod validated dialogs
- Admin assignment management: assign/unassign sites to studies, assign/unassign examiners to sites, assign/unassign examiners to specific study+site pairs (3-way SSE junction)
- Study detail page: per-site examiner assignment via checkbox panel (StudySitePanel) — shows available vs assigned examiners per site
- Viewer study detail page: read-only per-site examiner breakdown (ViewerStudySitePanel) — only shows sites with assigned examiners
- Audit log page — all admin CREATE/UPDATE actions recorded with before/after JSON snapshots; filterable by entity type; expandable inline diff rows (accordion, one at a time)
- Per-entity audit history pages — dedicated full-page paginated change history for each Study, Site, and Examiner
- `EntityAuditLogDialog` — inline modal showing change history for a specific entity (used from detail pages)
- `EntityAuditHistoryPage` — full-page server-paginated audit history with expandable inline diff panels (before→after per field)
- Global search with debounced auto-search, entity type toggle, and context-aware filters
- Collapsible sidebar navigation (separate Admin and Viewer sidebars)
- Protected routes with `ProtectedRoute` (any auth) and `AdminRoute` (ADMIN role only)
- Global Apollo error link — auto-redirects to `/login` on `UNAUTHENTICATED` errors
- Health check endpoint (`GET /health`) for backend liveness monitoring
- Zod validation on both backend (server-side) and frontend (form validation via react-hook-form)
- Auto-seeded database with 2 users, 20 studies, 20 sites, 20 examiners, and junction table links

## Target Users
- Developers learning full-stack GraphQL patterns with React + Apollo
- Teams evaluating a clinical data viewer/editor scaffold with role-based access and audit trails

## Use Cases
1. Log in as VIEWER → read-only dashboard, studies, sites, examiners, search
2. Log in as ADMIN → full CRUD on all entities, assignment management, audit logs
3. Admin creates a study → audit log records the CREATE with afterJson snapshot
4. Admin edits a study → audit log records the UPDATE with before/after JSON
5. Admin assigns a site to a study via autocomplete picker on the study detail page
6. Admin assigns an examiner to a site; site auto-activates when first examiner is assigned
7. Admin assigns an examiner to a study at a specific site via checkbox panel (study_site_examiners)
8. Admin unassigns last examiner from an Active site → site auto-downgrades to Planned
9. Search across all entities with keyword + filters; results update as you type (debounced)
10. Admin views per-entity change history at `/admin/studies/:id/history`, `/admin/sites/:id/history`, `/admin/examiners/:id/history`

## Seeded Credentials
| Role   | Email           | Password    |
|--------|-----------------|-------------|
| VIEWER | viewer@test.com | password123 |
| ADMIN  | admin@test.com  | password123 |

## Seeded Data
- 20 Studies (STUDY-001 to STUDY-020) across Phase I–III, statuses: Active / Completed / Planned
- 20 Sites (SITE-001 to SITE-020) across USA, Canada, UK, Germany, France, Japan, Australia, India, Brazil; statuses: Active / Closed
- 20 Examiners (EX-001 to EX-020) with roles: Principal Investigator / Sub-Investigator
- Junction tables: `study_sites` and `site_examiners` linking all three entities

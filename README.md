# SNA Demo — Full-Stack Clinical Study Management App

A full-stack clinical study management application built with React + Apollo Client → Express + Apollo Server + SQLite.

## Architecture

```
frontend/   React + Vite + Apollo Client + MUI + notistack  (port 5173)
backend/    Express + Apollo Server + SQLite + JWT           (port 4040)
```

## Seeded Credentials

| Role   | Email            | Password    |
|--------|------------------|-------------|
| ADMIN  | admin@test.com   | password123 |
| VIEWER | viewer@test.com  | password123 |

---

## Running the Backend

```bash
cd backend
npm install
npm run dev
```

GraphQL endpoint: http://localhost:4040/graphql  
Health check: http://localhost:4040/health

The database is created at `backend/data/app.db` on first run.  
Seed data (2 users, 20 studies, 20 sites, 20 examiners, junction links) is inserted automatically.

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Usage Flow

### Admin
1. Login as `admin@test.com` → redirected to `/admin/dashboard`
2. Manage Studies, Sites, Examiners via CRUD dialogs
3. Assign sites to studies; assign examiners to sites
4. Assign examiners per study per site via the StudySitePanel checkboxes
5. View audit history per entity at `/admin/studies/:id/history` etc.
6. Global audit log at `/admin/audit-logs`
7. Search across all entities at `/admin/search`

### Viewer
1. Login as `viewer@test.com` → redirected to `/viewer/dashboard`
2. Read-only access to studies, sites, examiners, search

---

## GraphQL API

### Queries (all require auth)
| Operation | Auth | Description |
|-----------|------|-------------|
| `me` | ✅ | Current user with role |
| `getStudies(page, pageSize)` | ✅ | Paginated studies |
| `getStudy(id)` | ✅ | Study with sites, examiners, studySites |
| `getSites(page, pageSize)` | ✅ | Paginated sites |
| `getSite(id)` | ✅ | Site with studies and examiners |
| `getExaminers(page, pageSize)` | ✅ | Paginated examiners |
| `getExaminer(id)` | ✅ | Examiner with studies and sites |
| `globalSearch(keyword, filters)` | ✅ | Cross-entity search |
| `getAuditLogs(entityType, entityId, page, pageSize)` | 🔒 ADMIN | Paginated audit log |

### Mutations
| Operation | Auth | Description |
|-----------|------|-------------|
| `login(email, password)` | ❌ | Sets HttpOnly cookie |
| `logout` | ✅ | Clears cookie |
| `createStudy(input)` | 🔒 ADMIN | Creates study (always Planned) |
| `updateStudy(id, input)` | 🔒 ADMIN | Updates study (forward-only status) |
| `assignSiteToStudy` / `unassignSiteFromStudy` | 🔒 ADMIN | Study-site junction |
| `assignExaminerToStudySite` / `unassignExaminerFromStudySite` | 🔒 ADMIN | Per-study per-site examiner (SSE) |
| `createSite(input)` / `updateSite(id, input)` | 🔒 ADMIN | Site CRUD |
| `assignExaminerToSite` / `unassignExaminerFromSite` | 🔒 ADMIN | Site-examiner junction |
| `createExaminer(input)` / `updateExaminer(id, input)` | 🔒 ADMIN | Examiner CRUD |

---

## Environment Variables

**backend/.env**
```
PORT=4040
JWT_SECRET=super-secret-jwt-key-change-in-production
DB_PATH=./data/app.db
# CORS_ORIGIN=https://your-production-frontend.com
```

**frontend/.env**
```
VITE_GRAPHQL_URL=http://localhost:4040/graphql
```

---

## Key Domain Rules

- `createStudy` always sets status = `Planned` (not caller-controlled)
- Status transitions are forward-only: `Planned → Active → Completed`
- `Planned → Active` requires ≥1 site, ≥1 examiner, startDate ≤ today, no Closed sites
- `Active → Completed` requires endDate ≤ today, ≥1 site, ≥1 examiner, no Active sites
- Sites cannot be set Active without at least one assigned examiner
- No hard delete of any entity (studies/sites/examiners/users)

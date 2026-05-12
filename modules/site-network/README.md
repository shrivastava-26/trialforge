# SNA Demo — Full-Stack Clinical Study Management App

A full-stack clinical study management application built with React + Apollo Client → Express + Apollo Server + SQLite.

## Quick Start

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

- App: http://localhost:5173
- GraphQL: http://localhost:4040/graphql
- Health: http://localhost:4040/health

## Seeded Credentials

| Role   | Email            | Password    |
|--------|------------------|-------------|
| ADMIN  | admin@test.com   | password123 |
| VIEWER | viewer@test.com  | password123 |

## Running Tests

```bash
# Backend (14 files, 155 tests)
cd backend && npm test

# Frontend (13 files, 63 tests)
cd frontend && npm test

# E2E — Playwright (3 specs)
npm run test:e2e            # headless
npm run test:e2e:headed     # headed
npm run test:e2e:slow       # headed + slowMo 500ms (demo mode)
npm run test:e2e:ui         # Playwright UI mode
```

## Architecture

```
frontend/   React + Vite + Apollo Client + MUI + notistack  (port 5173)
backend/    Express + Apollo Server + SQLite + JWT           (port 4040)
```

See [docs/architecture.md](docs/architecture.md) for detailed layering and folder structure.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | High-level architecture, folder structure, layering |
| [docs/database.md](docs/database.md) | ER diagram, key tables (SSE, certificates, refresh_tokens, audit_logs) |
| [docs/auth.md](docs/auth.md) | Login → access token → expiry → refreshSession → retry → logout |
| [docs/TESTING.md](docs/TESTING.md) | How to run unit/integration/e2e; what is covered |

## Key Domain Rules

- `createStudy` always sets status = `Planned` (not caller-controlled)
- Status transitions are forward-only: `Planned → Active → Completed`
- `Planned → Active` requires ≥1 site, ≥1 examiner, startDate ≤ today, no Closed sites
- `Active → Completed` requires endDate ≤ today, ≥1 site, ≥1 examiner, no Active sites
- Sites cannot be set Active without at least one assigned examiner
- Examiner assignment to site/study requires valid (non-expired) certificate
- No hard delete of any entity (studies/sites/examiners/users)

## Environment Variables

**backend/.env**
```
PORT=4040
JWT_SECRET=super-secret-jwt-key-change-in-production
DB_PATH=./data/app.db
```

**frontend/.env**
```
VITE_GRAPHQL_URL=http://localhost:4040/graphql
```

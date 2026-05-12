# Technology Stack

## Languages
- TypeScript 5.4 — both backend and frontend
  - Backend: `target: ES2020`, `module: commonjs`, `strict: true`
  - Frontend: `target: ES2020`, `module: ESNext`, `jsx: react-jsx`, `strict: true`, `noEmit: true`

## Backend
| Concern           | Library / Version          |
|-------------------|----------------------------|
| Runtime           | Node.js                    |
| HTTP framework    | Express 4.18               |
| GraphQL server    | Apollo Server 4.10         |
| GQL middleware    | `@apollo/server/express4`  |
| Database          | better-sqlite3 12.9 (sync) |
| Auth — tokens     | jsonwebtoken 9.0           |
| Auth — passwords  | bcryptjs 2.4               |
| Cookie parsing    | cookie-parser 1.4          |
| CORS              | cors 2.8                   |
| Env loading       | dotenv 16.4                |
| Validation        | zod 4.3                    |
| Dev server        | ts-node-dev 2.0            |
| Security headers  | helmet 8.1                 |
| Rate limiting     | express-rate-limit 8.4     |
| HTTP logging      | morgan 1.10                |
| Structured logging| winston 3.19               |
| Batch loading     | dataloader 2.2             |
| Testing           | vitest 3.2 + supertest 7.2 |
| Test coverage     | v8 provider; backend covers services/repositories/utils/resolvers; frontend covers components/pages/hooks/utils; reporter: text + lcov |
| E2E testing       | @playwright/test 1.59 (root-level) |

## Frontend
| Concern           | Library / Version          |
|-------------------|----------------------------|
| UI framework      | React 18.2                 |
| Build tool        | Vite 5.2                   |
| GraphQL client    | Apollo Client 3.9          |
| UI components     | MUI (Material UI) 9.0      |
| Data grid         | @mui/x-data-grid 9.0       |
| Icons             | @mui/icons-material 9.0    |
| Styling engine    | Emotion (react + styled)   |
| Routing           | React Router DOM 6.22      |
| Charts            | chart.js 4.5 + react-chartjs-2 5.3 |
| Forms             | react-hook-form 7.73       |
| Form validation   | zod 4.3 + @hookform/resolvers 5.2 |
| Toast/snackbar    | notistack 3.0              |
| Testing           | vitest 3.2 + @testing-library/react 16.3 |
| Test coverage     | v8 provider; frontend covers components/pages/hooks/utils; reporter: text + lcov |
| Test matchers     | @testing-library/jest-dom 6.9 |
| Test events       | @testing-library/user-event 14.6 |
| Test environment  | jsdom 27.0                 |

## Development Commands

### Backend
```bash
cd backend
npm install
npm run dev      # ts-node-dev --respawn --transpile-only src/server.ts
npm run build    # tsc → dist/
npm start        # node dist/server.js
npm test         # vitest run (unit + integration) — 14 test files, 155 tests
npm run test:watch    # vitest watch mode
npm run test:coverage # vitest with v8 coverage (services, repositories, utils, resolvers)
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # vite dev server
npm run build    # tsc + vite build
npm run preview  # vite preview of build output
npm test         # vitest run (component + smoke tests) — 13 test files, 63 tests
npm run test:watch    # vitest watch mode
npm run test:coverage # vitest with v8 coverage (components, pages, hooks, utils)
```

### E2E (Playwright)
```bash
# From project root
npm run test:e2e          # npx playwright test (headless chromium)
npm run test:e2e:headed   # npx playwright test --headed
# Requires backend (port 4040) + frontend (port 5173) running (auto-started via webServer config)
```

## Ports & Endpoints
| Service   | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:5173            |
| Backend   | http://localhost:4040            |
| GraphQL   | http://localhost:4040/graphql    |
| Health    | http://localhost:4040/health     |

## Environment Variables

**backend/.env**
```
PORT=4040
JWT_SECRET=super-secret-jwt-key-change-in-production
DB_PATH=./data/app.db
# ACCESS_TOKEN_TTL_MS=900000    (15 min — defined as constant in jwt.ts)
# REFRESH_TOKEN_TTL_MS=604800000 (7 days — defined as constant in authService.ts)
```

**frontend/.env**
```
VITE_GRAPHQL_URL=http://localhost:4040/graphql
```

## GraphQL API

### Queries (all require auth unless noted)
| Operation                          | Auth  | Description                                    |
|------------------------------------|-------|------------------------------------------------|
| `query me`                         | ✅    | Returns current user with role                 |
| `query getStudies(page, pageSize)` | ✅    | Paginated studies → `StudyPage{rows,total}`    |
| `query getStudy(id)`               | ✅    | Single study with nested sites + examiners + studySites |
| `query getSites(page, pageSize)`   | ✅    | Paginated sites → `SitePage{rows,total}`       |
| `query getSite(id)`                | ✅    | Single site with nested studies + examiners    |
| `query getExaminers(page,pageSize)`| ✅    | Paginated examiners → `ExaminerPage{rows,total}`|
| `query getExaminer(id)`            | ✅    | Single examiner with nested studies + sites + certificates |
| `query globalSearch(keyword,filters)`| ✅  | Cross-entity keyword search with filters       |
| `query getAuditLogs(entityType,entityTypes,entityId,page,pageSize)`| 🔒 ADMIN | Paginated audit log entries ordered DESC; entityTypes array takes priority over single entityType |

### Mutations
| Operation                              | Auth       | Description                          |
|----------------------------------------|------------|--------------------------------------|
| `mutation login(email, password)`      | ❌         | Sets `auth_token` (15m) + `refresh_token` (7d) HttpOnly cookies, returns user+role |
| `mutation logout`                      | ✅         | Revokes refresh token in DB, clears both cookies |
| `mutation refreshSession`              | ❌         | Validates + rotates refresh token, issues new access token; returns true/false |
| `mutation createStudy(input)`          | 🔒 ADMIN   | Creates study, logs audit (CREATE/Study) |
| `mutation updateStudy(id, input)`      | 🔒 ADMIN   | Updates study, logs audit (UPDATE/Study) |
| `mutation assignSiteToStudy(studyId, siteId)` | 🔒 ADMIN | Links site to study, logs audit (ASSIGN/StudySite) |
| `mutation unassignSiteFromStudy(studyId, siteId)` | 🔒 ADMIN | Unlinks site from study (blocked if SSE rows exist), logs audit (UNASSIGN/StudySite) |
| `mutation assignExaminerToStudySite(studyId, siteId, examinerId, certificateId?)` | 🔒 ADMIN | Links examiner to study at a specific site with certificate (3-way SSE); auto-selects latest valid cert if certificateId omitted; logs audit (ASSIGN/StudySiteExaminer) |
| `mutation unassignExaminerFromStudySite(studyId, siteId, examinerId)` | 🔒 ADMIN | Unlinks examiner from study at a specific site, logs audit (UNASSIGN/StudySiteExaminer) |
| `mutation createSite(input)`           | 🔒 ADMIN   | Creates site (always Planned), logs audit (CREATE/Site) |
| `mutation updateSite(id, input)`       | 🔒 ADMIN   | Updates site (domain rules apply), logs audit (UPDATE/Site) |
| `mutation assignExaminerToSite(siteId, examinerId)` | 🔒 ADMIN | Links examiner to site (requires valid certificate), logs audit (ASSIGN/SiteExaminer) |
| `mutation unassignExaminerFromSite(siteId, examinerId)` | 🔒 ADMIN | Unlinks examiner; auto-downgrades site if last, logs audit (UNASSIGN/SiteExaminer) |
| `mutation createExaminer(input)`       | 🔒 ADMIN   | Creates examiner, logs audit (CREATE/Examiner) |
| `mutation updateExaminer(id, input)`   | 🔒 ADMIN   | Updates examiner, logs audit (UPDATE/Examiner) |
| `mutation addExaminerCertificate(examinerId, input)` | 🔒 ADMIN | Adds certificate to examiner, logs audit (CREATE/ExaminerCertificate) |
| `mutation updateExaminerCertificate(id, input)` | 🔒 ADMIN | Updates certificate (certificateId or expiresOn), logs audit (UPDATE/ExaminerCertificate) |

## Database
- Engine: SQLite via `better-sqlite3` (synchronous API)
- File: `backend/data/app.db` (auto-created on first run)
- No ORM — raw SQL with typed helpers in `db/query.ts`
- Schema + indexes + migration shims in `db/migrate.ts`
- Tables: `users`, `studies`, `sites`, `examiners`, `examiner_certificates`, `study_sites`, `site_examiners`, `study_site_examiners`, `audit_logs`, `refresh_tokens`
- Seed: 2 users (ADMIN + VIEWER) always; 2 examiner certificates seeded automatically when examiners exist and no certs present yet (one valid, one expired)
- Migration shims: `ALTER TABLE ... ADD COLUMN` wrapped in try/catch for backward compatibility; `certificate_id` column added to `study_site_examiners` via shim; audit_logs table recreated if old CHECK constraint rejects ASSIGN

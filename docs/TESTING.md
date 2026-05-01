# Testing Guide

## How to Run

### Backend

```bash
cd backend

# All tests (unit + integration)
npm test

# Watch mode
npm run test:watch

# Coverage report (text + lcov)
npm run test:coverage
```

### Frontend

```bash
cd frontend

# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report (text + lcov)
npm run test:coverage
```

---

## Coverage Targets

| Package  | Lines target | Functions target |
|----------|-------------|-----------------|
| Backend  | ≥ 75%       | ≥ 65%           |
| Frontend | Meaningful raise from 0% baseline on admin/viewer pages |

---

## What Is Covered

### Backend — Unit Tests (`src/__tests__/unit/`)

| File | Module | What is tested |
|------|--------|----------------|
| `authService.test.ts` | `services/authService` | login success/failure, hashed token storage, refresh token TTL, refreshSession rotation, revoked/expired token rejection, revokeSession |
| `refreshTokenRepository.test.ts` | `repositories/refreshTokenRepository` | insert/find, revokeRefreshToken (with and without replacement hash), revokeAllUserRefreshTokens (scoped to user, idempotent) |
| `searchService.test.ts` | `services/searchService`, `repositories/searchRepository` | keyword matching (title, sponsor, name, specialty), entityType filter, domain filters (status, phase, city, country, role), %% wildcard |
| `auditService.test.ts` | `services/auditService`, `repositories/auditRepository` | all-logs query, DESC ordering, single entityType filter, entityTypes array (takes priority), entityId scoping, pagination (pageSize + page 2), insertAuditLog field storage, all four action types |
| `studyService.test.ts` | `services/studyService` | S1/D1/D2/S8 create rules, S2/S3/D4/D6/D3 status transitions, SI1 assign Planned site, D9 unassign from Active study |
| `siteService.test.ts` | `services/siteService` | P3 create always Planned, P1 Active requires examiner, SI3 Closed site, SI6 no valid cert, P2 auto-downgrade on last unassign |
| `examinerService.test.ts` | `services/examinerService` | hasValidCertificate (no cert, expired, valid), duplicate cert rejection, cross-examiner same cert allowed, updateCertificate conflict, getCertificatesByExaminer ordering |
| `sseIntegrity.test.ts` | `services/studyService` (SSE path) | SI5a site not in study_sites, SI5c examiner not in site_examiners, SI7 expired explicit cert, SI7 no valid cert auto-select, SI7 valid explicit cert, SI2 unassign blocked by SSE rows, SI2 succeeds after SSE removed, D7 Closed site blocks activation |

### Backend — Integration Tests (`src/__tests__/integration/`)

| File | What is tested |
|------|----------------|
| `graphql.test.ts` | VIEWER FORBIDDEN on createStudy, ADMIN createStudy returns Planned, BAD_USER_INPUT fieldErrors, UNAUTHENTICATED without cookie, /health endpoint |
| `graphqlExpanded.test.ts` | VIEWER FORBIDDEN on createSite/createExaminer/getAuditLogs, VIEWER can read studies, BAD_USER_INPUT Zod validation, invalid status transition, CREATE/UPDATE/ASSIGN/UNASSIGN audit log creation, refreshSession success (new cookie set), refreshSession false with no cookie, refreshSession false after logout (revoked), new access token from refresh allows protected query, expired cert assignment rejected, globalSearch grouped results, globalSearch empty, getAuditLogs with entityTypes array |

### Frontend — Component/Page Tests (`src/__tests__/`)

| File | Component | What is tested |
|------|-----------|----------------|
| `AdminRoute.test.tsx` | `AdminRoute` | loading spinner, redirect to /login, redirect to /viewer/dashboard for VIEWER, renders children for ADMIN |
| `ProtectedRoute.test.tsx` | `ProtectedRoute` | loading spinner, redirect to /login, renders children when logged in |
| `login.smoke.test.tsx` | `LoginPage` | renders without crash, email/password fields present |
| `ErrorBoundary.test.tsx` | `ErrorBoundary` | renders fallback on thrown error |
| `SearchPage.test.tsx` | `SearchPage` (shared) | idle state, single-char hint, no query before debounce, query fires after 400ms, study results render, empty results alert, result count summary |
| `AdminExaminerDetailPage.test.tsx` | `AdminExaminerDetailPage` | examiner details render, no-cert message, cert row with Valid chip, Add Certificate dialog opens, mutation fires + success toast, BAD_USER_INPUT shows field error toast |
| `AdminStudyDetailPage.test.tsx` | `AdminStudyDetailPage` + `StudySitePanel` | study/site/examiner render, checkbox unchecked state, CertificatePickerDialog opens on click, assign mutation fires after cert selection, unassign mutation fires on checked click, Completed study lock banner + disabled checkbox |
| `ViewerStudiesPage.test.tsx` | `ViewerStudiesPage` | heading renders, study rows render, no Create/Edit buttons (read-only), row click navigates to detail, error alert on query failure |

---

## Architecture Notes for Tests

- **Backend unit tests** use a real in-memory SQLite DB (`initConnection(':memory:')` + `initDb()`) reset in `beforeEach`. No mocking of repositories — tests exercise the full service→repository→DB stack.
- **Backend integration tests** use `supertest` against the full Express+Apollo app with an in-memory DB. JWT tokens are minted directly via `signToken` to avoid cookie round-trips for setup.
- **Frontend tests** use `MockedProvider` from `@apollo/client/testing` for Apollo queries/mutations, `MemoryRouter` for routing, and `SnackbarProvider` for toast assertions. Heavy layout components (AdminLayout, ViewerLayout) are vi-mocked to avoid sidebar/header rendering overhead.
- **Fake timers** (`vi.useFakeTimers`) are used in `SearchPage.test.tsx` to control the 400ms debounce deterministically.

---

## What Remains and Why

| Area | Status | Reason |
|------|--------|--------|
| Dashboard charts (Chart.js) | Not tested | Chart.js canvas rendering is not supported in jsdom; visual regression tools (Playwright/Storybook) are more appropriate |
| `apolloClient.ts` errorLink | Not tested | Requires simulating network-level errors and cookie manipulation; better covered by E2E tests |
| `AuditLogsPage` / `EntityAuditHistoryPage` | Not tested | Heavy MUI Table + accordion; high setup cost for marginal unit-test value; integration tests cover the underlying GQL query |
| `AdminStudiesPage` / `AdminSitesPage` CRUD dialogs | Not tested | 2-step Stepper dialogs with many fields; covered by integration tests for the mutations themselves |
| Viewer detail pages (SiteDetailPage, ExaminerDetailPage) | Not tested | Read-only rendering; pattern identical to ViewerStudiesPage which is covered |
| `useUrlPagination` hook | Not tested | Pure URL state management; low risk, no domain logic |
| `auditDiff.ts` utilities | Not tested | Pure functions with no side effects; straightforward to add if desired |

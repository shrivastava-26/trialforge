# TrialForge — Testing Strategy

## Running Tests

### Per-Module (from repo root)

```bash
npm run test:site-network           # backend + frontend tests
npm run test:site-network:backend   # backend only
npm run e2e:site-network            # Playwright e2e
```

### From Within a Module

```bash
cd modules/site-network
npm run test:backend      # vitest (unit + integration)
npm run test:frontend     # vitest (component tests)
npm run test:e2e          # playwright (requires servers running)
```

### Platform-Level E2E (future)

```bash
npm run e2e               # cross-module smoke tests
```

## Coverage Expectations

| Layer | Target | Rationale |
|-------|--------|-----------|
| Backend resolvers + services | 75%+ | Business logic and auth guards live here |
| Backend repositories | 60%+ | SQL correctness matters |
| Frontend components | 50%+ | Snapshot + interaction coverage |
| E2E (Playwright) | Smoke | Critical flows work end-to-end |

Backend coverage is prioritized — resolvers contain authorization and domain rules.

## Test Types

| Type | Tool | Location |
|------|------|----------|
| Unit + Integration (backend) | Vitest | `modules/<mod>/backend/src/__tests__/` |
| Component (frontend) | Vitest + Testing Library | `modules/<mod>/frontend/src/__tests__/` |
| E2E | Playwright | `modules/<mod>/e2e/` or root `e2e/` |

## Conventions

- Backend tests use real in-memory SQLite (`:memory:`) — no mocking repositories.
- Integration tests use `supertest` against the full Express+Apollo stack.
- Frontend tests use `MockedProvider` for Apollo, `MemoryRouter` for routing.
- E2E tests generate unique IDs per run to avoid conflicts.

## CI Pipeline (Future)

```yaml
jobs:
  test-module:
    strategy:
      matrix:
        module: [site-network, identity]
    steps:
      - checkout
      - install deps
      - run backend tests + coverage
      - run frontend tests + coverage
      - start servers
      - run playwright e2e
      - upload coverage artifacts
```

Each module tested independently. Platform e2e runs after all modules pass.

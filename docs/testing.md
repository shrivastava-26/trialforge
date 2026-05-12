# TrialForge — Testing Strategy

## Running Tests

### Per-Module Tests

From the repo root:

```bash
# Site Network — backend unit/integration tests
npm run test:site-network:backend

# Site Network — all tests (backend + frontend + e2e)
npm run test:site-network

# Site Network — Playwright e2e only
npm run e2e:site-network
```

Or from within the module:

```bash
cd modules/site-network
npm run test:backend
npm run test:frontend
npm run test:e2e
```

### Platform-Level E2E

```bash
# (future) Cross-module smoke tests
npm run e2e
```

## Coverage Expectations

| Layer | Target | Rationale |
|-------|--------|-----------|
| Backend resolvers + services | 80%+ | Business logic lives here |
| Backend DB/seed utilities | 60%+ | Important but less critical |
| Frontend components | 50%+ | Snapshot + interaction tests |
| E2E (Playwright) | Smoke coverage | Confidence that critical flows work end-to-end |

Backend coverage is prioritized over frontend because:
- GraphQL resolvers contain authorization and business rules.
- Frontend is more volatile (UI changes frequently).
- E2E tests catch integration regressions that unit tests miss.

## Test Types

| Type | Tool | Location |
|------|------|----------|
| Unit (backend) | Vitest or Jest | `modules/<mod>/backend/__tests__/` |
| Unit (frontend) | Vitest + Testing Library | `modules/<mod>/frontend/src/**/*.test.tsx` |
| E2E | Playwright | `modules/<mod>/e2e/` or root `e2e/` |

## CI Pipeline (Future)

```yaml
# Conceptual — will be GitHub Actions or similar
jobs:
  test-module:
    strategy:
      matrix:
        module: [site-network, identity, ...]
    steps:
      - checkout
      - install deps
      - run backend tests
      - run frontend tests
      - start backend + frontend
      - run playwright e2e
      - upload coverage
```

Each module is tested independently. Platform e2e runs after all modules pass.

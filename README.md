# TrialForge

A modular clinical-trial management platform built with Node/TypeScript/GraphQL/SQLite + React/TypeScript/Apollo/MUI.

## Repository Layout

```
trialforge/
├── modules/
│   ├── site-network/       ← Module 1: Site Network Administration (SNA) — fully functional
│   └── identity/           ← Module 2: Identity & Access (scaffolded, Phase 0.2)
├── packages/
│   ├── shared-types/       ← Cross-module TypeScript types
│   ├── shared-validation/  ← Shared validation schemas (Zod, etc.)
│   └── shared-ui/          ← Shared React/MUI components
├── docs/                   ← Platform documentation
├── e2e/                    ← Platform-level end-to-end tests
└── package.json            ← Root orchestration scripts
```

## Modules

### Site Network Administration (SNA)

The first and currently active module. Manages clinical sites, investigators, feasibility assessments, and network analytics.

- **Backend:** Express + Apollo Server + SQLite (`modules/site-network/backend/`)
- **Frontend:** React + Apollo Client + MUI (`modules/site-network/frontend/`)
- **E2E:** Playwright (`modules/site-network/e2e/`)

## Quick Start

### Environment Setup

Before running any module, copy the environment template:

```bash
# For each module you plan to use, copy .env.example to .env
cp modules/site-network/backend/.env.example modules/site-network/backend/.env
cp modules/reporting/backend/.env.example modules/reporting/backend/.env
# ... repeat for other modules as needed
```

**Important:** 
- Keep `.env` files local only (they are gitignored)
- The `.env.example` files contain demo placeholders
- Change JWT secrets and other sensitive values for production

### Development

```bash
# Start the SNA backend (installs deps automatically)
npm run dev:site-network:backend

# In another terminal — start the SNA frontend
npm run dev:site-network:frontend
```

### Platform UI Shell

```bash
# Terminal 1 — Auth backend (port 4000)
npm run dev:site-network:backend

# Terminal 2 — Reporting backend (port 4120)
npm run dev:reporting:backend

# Terminal 3 — Shell app (port 5173)
npm run dev:shell
```

### GraphQL Gateway (Phase 1.1)

The gateway provides a single GraphQL endpoint at port 4200 that proxies auth and reporting operations to their respective backends. The shell currently still uses two direct clients; migration to the gateway endpoint will happen in Phase 1.2.

```bash
# Copy env template
cp modules/gateway/backend/.env.example modules/gateway/backend/.env

# Start gateway (requires site-network + reporting backends running)
npm run dev:gateway

# Run tests
npm run test:gateway

# Build
npm run build:gateway
```

## Running Tests

```bash
# All SNA tests (backend + frontend)
npm run test:site-network

# Backend tests only
npm run test:site-network:backend

# Shell app tests
npm run test:shell

# Playwright e2e tests (requires backend + frontend running)
npm run e2e:site-network
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/vision.md](docs/vision.md) | Platform vision, scope, policies, roadmap |
| [docs/architecture.md](docs/architecture.md) | System architecture and module boundaries |
| [docs/database.md](docs/database.md) | Database strategy and migration path |
| [docs/auth.md](docs/auth.md) | Authentication approach (dual-token, future Identity module) |
| [docs/testing.md](docs/testing.md) | Testing strategy, coverage expectations, CI |

## Key Policies

- **Synthetic data only** — no real patient or site data in this repo.
- **No hard deletes** — all entities use soft-delete/archive lifecycle.
- **Module isolation** — modules do not import from each other; shared code lives in `packages/`.

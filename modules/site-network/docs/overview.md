# Site Network Administration (SNA) — Overview

## Purpose

Manages the network of clinical trial sites, investigators (examiners), and their assignments to studies. Provides feasibility assessment, network analytics, and full audit trail.

## Key Entities

- **Study** — A clinical trial protocol with lifecycle (Planned → Active → Completed).
- **Site** — A physical location where trials are conducted (Planned → Active → Closed).
- **Examiner** — An investigator/physician assigned to sites and studies.
- **Certificate** — GCP certification per examiner with expiry tracking.
- **Study-Site** — Assignment of a site to a study.
- **Site-Examiner** — Assignment of an examiner to a site.
- **Study-Site-Examiner (SSE)** — 3-way junction: examiner participates in a study at a specific site.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express + Apollo Server + better-sqlite3 |
| Frontend | React 18 + Apollo Client + MUI 5 |
| Validation | Zod (both sides) |
| Auth | Dual-token (access JWT + refresh token rotation) |
| Testing | Vitest (unit/integration) + Playwright (e2e) |

## Running

```bash
# From repo root
npm run dev:site-network:backend    # Express on port 4040
npm run dev:site-network:frontend   # Vite on port 5173
```

## Related Docs

- [Architecture](./architecture.md)
- [Database / Data Model](./database.md)
- [Auth](./auth.md)
- [Testing](./TESTING.md)

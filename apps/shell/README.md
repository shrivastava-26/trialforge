# TrialForge Platform Shell

UI shell for the TrialForge platform. Connects to:
- Auth backend (site-network) at `VITE_AUTH_GRAPHQL_URL`
- Reporting backend at `VITE_REPORTING_GRAPHQL_URL`

## Running Locally

```bash
# Terminal 1 — Auth backend (port 4000)
cd modules/site-network/backend && npm run dev

# Terminal 2 — Reporting backend (port 4120)
cd modules/reporting/backend && npm run dev

# Terminal 3 — Shell app (port 5173)
cd apps/shell && npm run dev
```

## Running Tests

```bash
cd apps/shell
npm test
```

## Notes

### Apollo Sandbox Introspection Traffic

When visiting `http://localhost:4000/graphql` or `http://localhost:4120/graphql` directly in a browser, Apollo Sandbox sends `__schema` introspection queries automatically. This is **normal devtools behavior** and does not indicate a bug in the shell app. These requests are unrelated to the shell's runtime network calls.

### Expected Network Behavior

After login, the shell makes:
- **One** `Me` query on mount to check session
- **Zero** reporting queries until user clicks "Load Metrics"
- No polling or automatic refetch

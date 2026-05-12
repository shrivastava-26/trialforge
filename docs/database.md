# TrialForge — Database Strategy

## Current Approach

Each module uses **SQLite** (`better-sqlite3`) for local development:

- Zero infrastructure — `npm install` and go.
- DB file lives inside the module's `backend/data/` directory.
- Schema managed via module-local migration scripts.

## Migration Path

| Phase | Database |
|-------|----------|
| Dev / Learning | SQLite (file-based, per module) |
| Staging | PostgreSQL (single instance, schema-per-module) |
| Production | PostgreSQL (dedicated or shared with strict schema isolation) |

Migration uses a query-builder abstraction so dialect differences are handled at the adapter layer.

## Module-Owned Schemas

Each module owns its schema exclusively:

```
database: trialforge
├── schema: site_network    ← owned by site-network module
├── schema: identity        ← owned by identity module
├── schema: patient         ← owned by patient-registry module
└── schema: shared          ← read-only reference data (country codes, etc.)
```

Rules:
1. A module may only read/write tables in its own schema.
2. Cross-module data access via GraphQL APIs, never direct DB joins.
3. Shared reference data is read-only for all modules.

## Soft-Delete Convention

All tables include:

```sql
archived_at  TEXT NULL,    -- ISO timestamp
archived_by  TEXT NULL     -- user ID or email
```

Default queries filter `WHERE archived_at IS NULL`. Archived records remain queryable via explicit filters.

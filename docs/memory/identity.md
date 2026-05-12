# Memory: Identity Module

> Quick-reference for AI assistants working on `modules/identity/`.

## Status

**Not yet implemented.** Scaffolded as empty directory. Target: Phase 0.2.

## Planned Scope

- User management (CRUD, soft-delete/archive).
- Organization/tenant management.
- Role definitions and role-user assignments.
- Centralized authentication (login, logout, refresh).
- JWT issuance with org/role/module claims.
- Password hashing (bcrypt), refresh token rotation.

## Design Constraints (when implementing)

1. Follow the same layered architecture as SNA: Resolvers → Services → Repositories → DB.
2. Use SQLite for dev, same `better-sqlite3` approach.
3. Dual-token auth pattern (access JWT + refresh token rotation).
4. Zod validation on all inputs.
5. Audit all mutations.
6. No hard deletes — use `archived_at`.
7. Must not break or modify `modules/site-network/`.

## Integration Plan

- SNA currently has its own auth (2 hardcoded seed users).
- Once Identity is stable, SNA will optionally consume Identity's JWT validation.
- Migration is opt-in and non-breaking — SNA's existing auth continues to work.

## Entities (Planned)

| Entity | Key Fields |
|--------|-----------|
| User | id, email, passwordHash, displayName, orgId, status, archivedAt |
| Organization | id, name, type, status, archivedAt |
| Role | id, name, description, moduleScope |
| UserRole | userId, roleId, assignedAt |

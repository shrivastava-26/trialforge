# TrialForge — Authentication & Authorization

## Baseline: Dual-Token Auth (established by SNA)

| Token | Purpose | Lifetime | Storage |
|-------|---------|----------|---------|
| Access JWT | Authorize API requests | 15 min | HttpOnly cookie |
| Refresh Token | Obtain new access tokens | 7 days | HttpOnly cookie (SHA-256 hash in DB) |

### Core Flow

1. Login → server issues access JWT + refresh token (both as HttpOnly cookies).
2. Every GraphQL request sends access JWT automatically via cookie.
3. On 401 / expiry → client calls `refreshSession` mutation.
4. Server validates refresh token hash, rotates it, issues new pair.
5. On refresh failure → client clears store, redirects to login.

### Security Properties

- Refresh tokens stored as SHA-256 hashes only (raw never persisted).
- Single-use rotation: each refresh invalidates the previous token.
- `replaced_by_token_hash` field enables replay-attack detection.
- No hard deletes on `refresh_tokens` — revoked rows retained for audit.

## Future: Central Identity Module

Phase 0.2+ extracts auth into `modules/identity/`:

- Single sign-on across all modules.
- RBAC with module-scoped permissions.
- Organization/tenant context in JWT claims.
- Other modules validate JWTs locally (shared public key) but delegate user management to Identity.

### Target JWT Claims
## Baseline: Dual-Token Auth (from SNA)

The Site Network module established the auth pattern that the platform will standardize on:

| Token | Purpose | Lifetime | Storage |
|-------|---------|----------|---------|
| Access JWT | Authorize API requests | Short (15 min) | Memory / HTTP-only cookie |
| Refresh Token | Obtain new access tokens | Longer (7 days) | HTTP-only secure cookie |

### Flow

```
1. User logs in → server issues access JWT + refresh token
2. Client sends access JWT on every GraphQL request (Authorization header)
3. On 401 / token expiry → client calls refresh endpoint
4. Server validates refresh token, rotates it, issues new pair
5. On refresh failure → user is logged out
```

### Refresh Token Rotation

Each refresh token is single-use. On every refresh, the old token is invalidated and a new one is issued. This limits the window for token theft.

## Future: Central Identity Module

In Phase 0.2+, authentication will be extracted into `modules/identity/`:

- Single sign-on across all modules.
- Role-based access control (RBAC) with module-scoped permissions.
- Organization/tenant context embedded in JWT claims.
- Identity module exposes a GraphQL API for user/role management.
- Other modules validate JWTs locally (shared public key) but delegate user management to Identity.

### JWT Claims (target)

```json
{
  "sub": "user-uuid",
  "org": "org-uuid",
  "roles": ["site_admin", "data_manager"],
  "modules": ["site-network", "patient-registry"],
  "iat": 1700000000,
  "exp": 1700000900
}
```

## Migration Plan

1. SNA continues with its existing auth unchanged.
2. Identity module implements centralized auth service.
3. SNA migrates to consume Identity's auth (opt-in, non-breaking).
1. SNA continues to work with its existing auth as-is (no changes).
2. Identity module implements the centralized auth service.
3. Once stable, SNA migrates to consume Identity's auth (opt-in, non-breaking).

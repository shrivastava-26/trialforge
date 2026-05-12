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

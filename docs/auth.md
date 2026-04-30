# Authentication & Session Management

## Overview

SNA-y2 uses a **dual-token** session strategy:

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access token (JWT) | 15 minutes | `auth_token` HttpOnly cookie | Authenticates every GraphQL request |
| Refresh token (opaque) | 7 days | `refresh_token` HttpOnly cookie | Issues new access tokens without re-login |

Both cookies are **HttpOnly** (no JS access), **SameSite=Lax**, and **Secure in production**.

---

## Environment Variables

```
# backend/.env
JWT_SECRET=<min-16-char-random-string>   # Signs/verifies access JWTs
ACCESS_TOKEN_TTL_MS=900000               # 15 min — defined as constant in jwt.ts
REFRESH_TOKEN_TTL_MS=604800000           # 7 days — defined as constant in authService.ts
```

TTL constants live in code (`ACCESS_TOKEN_TTL_MS` in `utils/jwt.ts`, `REFRESH_TOKEN_TTL_MS` in `services/authService.ts`) and are referenced by both the JWT signer and the cookie `maxAge` to keep them in sync.

---

## Database Schema

```sql
CREATE TABLE refresh_tokens (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                INTEGER NOT NULL REFERENCES users(id),
  token_hash             TEXT NOT NULL UNIQUE,   -- SHA-256 of the raw token
  expires_at             TEXT NOT NULL,           -- ISO datetime
  revoked_at             TEXT,                    -- NULL = active; set on logout/rotation
  replaced_by_token_hash TEXT,                    -- set during rotation for audit trail
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**No hard deletes.** Rows are retained indefinitely; `revoked_at IS NOT NULL` means the session is dead. This preserves a full audit trail of all sessions.

---

## Token Security

- **Refresh token value** is a 48-byte cryptographically random hex string (`crypto.randomBytes(48)`).
- **Only the SHA-256 hash** is stored in the database (`token_hash`). The raw value is never persisted.
- If the database is compromised, raw tokens cannot be recovered from hashes.
- **Rotation**: every successful refresh issues a brand-new refresh token and revokes the old one, recording `replaced_by_token_hash` for the audit chain.

---

## Full Auth Flow

### 1. Login

```
Client                          Backend
  │                                │
  ├─ mutation login(email,pw) ────►│
  │                                ├─ bcrypt.verify(pw, hash)
  │                                ├─ signToken(15m) → access JWT
  │                                ├─ generateRefreshToken() → 96-char hex
  │                                ├─ hashToken() → SHA-256
  │                                ├─ INSERT refresh_tokens row
  │                                ├─ Set-Cookie: auth_token (15m, HttpOnly)
  │                                ├─ Set-Cookie: refresh_token (7d, HttpOnly)
  │◄─ { user: {id,email,role} } ───┤
  │                                │
  ├─ refetchQueries([ME_QUERY]) ──►│  (AuthContext updates)
```

### 2. Authenticated Request (access token valid)

```
Client                          Backend
  │                                │
  ├─ Any GQL query/mutation ──────►│  (browser sends auth_token cookie automatically)
  │                                ├─ verifyToken(auth_token) → JwtPayload
  │                                ├─ context.user populated
  │◄─ data ────────────────────────┤
```

### 3. Access Token Expiry → Refresh & Retry

```
Client (Apollo errorLink)        Backend
  │                                │
  ├─ Any GQL operation ───────────►│
  │◄─ UNAUTHENTICATED error ───────┤  (access JWT expired)
  │                                │
  ├─ mutation refreshSession ─────►│  (refresh_token cookie sent automatically)
  │                                ├─ hashToken(refresh_token cookie)
  │                                ├─ SELECT refresh_tokens WHERE token_hash = ?
  │                                ├─ Check: not revoked, not expired
  │                                ├─ signToken(15m) → new access JWT
  │                                ├─ generateRefreshToken() → new raw token
  │                                ├─ INSERT new refresh_tokens row
  │                                ├─ UPDATE old row: revoked_at=now, replaced_by=newHash
  │                                ├─ Set-Cookie: auth_token (new, 15m)
  │                                ├─ Set-Cookie: refresh_token (new, 7d)
  │◄─ refreshSession: true ────────┤
  │                                │
  ├─ Retry original operation ────►│  (new auth_token cookie sent)
  │◄─ data ────────────────────────┤
```

If `refreshSession` returns `false` (token expired/revoked/missing):
- Apollo errorLink calls `client.clearStore()` and redirects to `/login`.

### 4. Logout

```
Client                          Backend
  │                                │
  ├─ mutation logout ─────────────►│  (both cookies sent)
  │                                ├─ hashToken(refresh_token cookie)
  │                                ├─ UPDATE refresh_tokens SET revoked_at=now
  │                                ├─ clearCookie(auth_token)
  │                                ├─ clearCookie(refresh_token)
  │◄─ logout: true ────────────────┤
  │                                │
  ├─ client.clearStore() ──────────┤  (AuthContext resets, redirect to /login)
```

---

## Concurrent Request Handling

The Apollo errorLink uses a **single shared in-flight promise** (`refreshPromise`) for the `refreshSession` call. If multiple requests fail with `UNAUTHENTICATED` simultaneously, only one `refreshSession` mutation is sent; all other requests wait on the same promise and retry together once it resolves.

---

## Security Notes

| Concern | Mitigation |
|---|---|
| XSS token theft | HttpOnly cookies — JS cannot read `auth_token` or `refresh_token` |
| CSRF | SameSite=Lax blocks cross-site form submissions; GraphQL POST-only |
| Token replay after logout | Refresh token hash revoked in DB on logout; old token rejected |
| DB compromise | Only SHA-256 hashes stored; raw tokens unrecoverable |
| Refresh token reuse (stolen token) | Rotation: each use invalidates the previous token |
| Infinite refresh loop | errorLink skips refresh when the failing op is `RefreshSession` itself |
| Long-lived session abuse | 7-day TTL; `revokeAllUserRefreshTokens()` available for forced logout |
| JWT secret exposure | Validated at startup (min 16 chars via Zod `envSchema`); must be rotated before production |

---

## Manual Test Checklist

1. **Login sets both cookies**
   - Open DevTools → Application → Cookies
   - POST `mutation login` → verify `auth_token` (15m) and `refresh_token` (7d) are set, both HttpOnly

2. **Access token expiry → transparent refresh**
   - Temporarily set `ACCESS_TOKEN_TTL_MS` to `5000` (5s) and restart backend
   - Log in, wait 6 seconds, then trigger any GQL query
   - Verify: no redirect to `/login`; query succeeds; `auth_token` cookie has a new expiry; `refresh_token` cookie is also rotated

3. **Refresh token expired/revoked → redirect to login**
   - Log in, then manually `UPDATE refresh_tokens SET revoked_at = datetime('now')` in SQLite
   - Wait for access token to expire, then trigger any GQL query
   - Verify: redirected to `/login`; both cookies cleared

4. **Logout revokes refresh token**
   - Log in, note the `token_hash` in `refresh_tokens`
   - Call `mutation logout`
   - Verify: `revoked_at` is set in DB; both cookies cleared; subsequent requests redirect to `/login`

5. **Concurrent requests on expiry**
   - With a short access TTL, trigger 3 simultaneous GQL queries after expiry
   - Verify: only one `refreshSession` network call in DevTools; all 3 queries succeed

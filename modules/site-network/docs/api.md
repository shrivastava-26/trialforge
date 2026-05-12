# Site Network — API Reference

## Endpoint

- **GraphQL:** `POST http://localhost:4040/graphql`
- **Health:** `GET http://localhost:4040/health`

## Authentication

All queries/mutations (except `login`, `refreshSession`) require a valid `auth_token` HttpOnly cookie.

Admin mutations require `role: ADMIN` in the JWT payload.

## Queries

| Query | Auth | Description |
|-------|------|-------------|
| `me` | Any | Current user info |
| `studies(page, pageSize)` | Any | Paginated study list |
| `study(id)` | Any | Single study with sites + examiners |
| `sites(page, pageSize)` | Any | Paginated site list |
| `site(id)` | Any | Single site with examiners + studies |
| `examiners(page, pageSize)` | Any | Paginated examiner list |
| `examiner(id)` | Any | Single examiner with certs + sites |
| `globalSearch(keyword, entityType?, filters?)` | Any | Cross-entity search |
| `auditLogs(entityType?, entityTypes?, entityId?, page?, pageSize?)` | Admin | Audit trail |

## Mutations

| Mutation | Auth | Description |
|----------|------|-------------|
| `login(email, password)` | None | Returns user, sets cookies |
| `logout` | Any | Revokes refresh token, clears cookies |
| `refreshSession` | Cookie | Rotates tokens |
| `createStudy(input)` | Admin | Creates study (status: Planned) |
| `updateStudy(id, input)` | Admin | Updates study fields + status transitions |
| `createSite(input)` | Admin | Creates site (status: Planned) |
| `updateSite(id, input)` | Admin | Updates site fields + status transitions |
| `createExaminer(input)` | Admin | Creates examiner |
| `updateExaminer(id, input)` | Admin | Updates examiner fields |
| `addExaminerCertificate(examinerId, input)` | Admin | Adds GCP certificate |
| `updateExaminerCertificate(certId, input)` | Admin | Updates certificate |
| `assignSiteToStudy(studyId, siteId)` | Admin | Creates study_sites row |
| `unassignSiteFromStudy(studyId, siteId)` | Admin | Removes study_sites row (if no SSE) |
| `assignExaminerToSite(siteId, examinerId)` | Admin | Creates site_examiners row |
| `unassignExaminerFromSite(siteId, examinerId)` | Admin | Removes site_examiners row |
| `assignExaminerToStudySite(studyId, siteId, examinerId, certId?)` | Admin | Creates SSE row |
| `unassignExaminerFromStudySite(studyId, siteId, examinerId)` | Admin | Removes SSE row |

## Error Codes

| Code | Meaning |
|------|---------|
| `UNAUTHENTICATED` | Missing or expired access token |
| `FORBIDDEN` | Valid token but insufficient role |
| `BAD_USER_INPUT` | Zod validation failure (includes `fieldErrors`) |
| `BUSINESS_RULE_VIOLATION` | Domain rule violated (e.g., invalid status transition) |

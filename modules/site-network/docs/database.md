# Database

## Engine

SQLite via `better-sqlite3` (synchronous API). File: `backend/data/app.db` (auto-created on first run).

## Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│    users     │       │   studies    │       │      sites       │
├──────────────┤       ├──────────────┤       ├──────────────────┤
│ id PK        │       │ id PK        │◄──┐   │ id PK            │
│ email UNIQUE │       │ protocolId UQ│    │   │ siteCode UNIQUE  │
│ password     │       │ title        │    │   │ name             │
│ role         │       │ sponsor      │    │   │ city             │
└──────────────┘       │ phase        │    │   │ country          │
                       │ startDate    │    │   │ status           │
                       │ endDate      │    │   └────────┬─────────┘
                       │ status       │    │            │
                       │ description  │    │            │
                       └──────┬───────┘    │            │
                              │            │            │
                    ┌─────────┴────────┐   │   ┌───────┴──────────┐
                    │   study_sites    │   │   │  site_examiners  │
                    ├──────────────────┤   │   ├──────────────────┤
                    │ study_id FK ─────┼───┘   │ site_id FK       │
                    │ site_id FK ──────┼───────│ examiner_id FK   │
                    └────────┬─────────┘       └───────┬──────────┘
                             │                         │
                    ┌────────┴─────────────────────────┴──────────┐
                    │         study_site_examiners (SSE)           │
                    ├─────────────────────────────────────────────┤
                    │ study_id FK      (PK part)                  │
                    │ site_id FK       (PK part)                  │
                    │ examiner_id FK   (PK part)                  │
                    │ certificate_id FK → examiner_certificates   │
                    └─────────────────────────────────────────────┘

┌──────────────────┐       ┌─────────────────────────┐
│    examiners     │       │  examiner_certificates  │
├──────────────────┤       ├─────────────────────────┤
│ id PK            │◄──────│ examiner_id FK          │
│ examinerCode UQ  │       │ id PK                   │
│ name             │       │ certificateId TEXT       │
│ specialty        │       │ expiresOn TEXT (date)    │
│ email            │       │ UNIQUE(examiner_id,      │
│ role             │       │        certificateId)    │
│ status           │       └─────────────────────────┘
└──────────────────┘

┌─────────────────────────┐       ┌─────────────────────────┐
│       audit_logs        │       │     refresh_tokens      │
├─────────────────────────┤       ├─────────────────────────┤
│ id PK                   │       │ id PK                   │
│ actorUserId FK          │       │ user_id FK              │
│ actorEmail              │       │ token_hash TEXT         │
│ action (CHECK)          │       │ expires_at TEXT         │
│ entityType              │       │ revoked_at TEXT (null)  │
│ entityId                │       │ replaced_by_token_hash  │
│ beforeJson              │       │ created_at TEXT         │
│ afterJson               │       └─────────────────────────┘
│ createdAt               │
└─────────────────────────┘
```

## Key Tables

### study_site_examiners (SSE)

The 3-way junction table tracking which examiners participate in a study at a specific site, linked to the certificate used at assignment time.

- **PK**: `(study_id, site_id, examiner_id)`
- **Prerequisites**: `(study_id, site_id)` must exist in `study_sites` AND `(site_id, examiner_id)` must exist in `site_examiners`
- **certificate_id**: FK to `examiner_certificates` — auto-selected (latest valid) or explicitly chosen

### examiner_certificates

GCP certificates per examiner with expiry tracking.

- **Validity check**: `expiresOn >= today` (ISO date comparison)
- **Required before**: assigning examiner to site (`SI6`) or to study-site (`SI7`)
- **UNIQUE constraint**: `(examiner_id, certificateId)` — same cert ID cannot be duplicated per examiner

### refresh_tokens

Opaque refresh tokens stored as SHA-256 hashes. Supports rotation with audit trail.

- **token_hash**: SHA-256 of the raw token (never stored in plaintext)
- **revoked_at**: set on logout or rotation (soft-revoke, never hard-deleted)
- **replaced_by_token_hash**: links old → new token for replay attack detection

### audit_logs

Complete audit trail of all admin mutations.

- **action**: `CREATE | UPDATE | ASSIGN | UNASSIGN`
- **entityType**: `Study | Site | Examiner | ExaminerCertificate | StudySite | SiteExaminer | StudySiteExaminer`
- **beforeJson / afterJson**: full JSON snapshots for diffing

## Indexes

```sql
CREATE INDEX idx_studies_search ON studies(title, sponsor, status, phase);
CREATE INDEX idx_sites_search ON sites(name, city, country, status);
CREATE INDEX idx_examiners_search ON examiners(name, role);
CREATE INDEX idx_audit_actor ON audit_logs(actorUserId);
CREATE INDEX idx_audit_entity ON audit_logs(entityType, entityId);
CREATE INDEX idx_sse_study_site ON study_site_examiners(study_id, site_id);
CREATE INDEX idx_sse_examiner ON study_site_examiners(examiner_id);
CREATE INDEX idx_certs_examiner ON examiner_certificates(examiner_id);
CREATE INDEX idx_certs_expiry ON examiner_certificates(expiresOn);
```

## Seed Data

- 2 users (ADMIN + VIEWER) — always seeded on first run
- 2 examiner certificates — seeded when examiners exist and no certs present (one valid, one expired)
- All other data created through the admin interface

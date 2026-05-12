# Site Network — Data Model

> Full ERD and schema details: [database.md](./database.md)

## Entity Lifecycle Rules

### Study Status Transitions

```
Planned → Active → Completed
```

- **Planned:** Default on creation. Can assign/unassign sites freely.
- **Active:** Requires at least one Active site. Cannot be created directly.
- **Completed:** Terminal state. No further assignments allowed.

### Site Status Transitions

```
Planned → Active → Closed
```

- **Planned:** Default on creation. Can be assigned to studies.
- **Active:** Requires at least one examiner with a valid certificate.
- **Closed:** Cannot be assigned to new studies. Auto-downgrade if last examiner removed.

### Examiner

No status field. Examiners are always active. Assignment requires a valid (non-expired) GCP certificate.

## Key Constraints

| Rule | Enforcement |
|------|-------------|
| Site must have valid-cert examiner to go Active | Service layer check |
| SSE requires both study_sites and site_examiners rows | FK + service validation |
| Certificate uniqueness per examiner | DB UNIQUE constraint |
| No hard deletes | No DELETE statements exist in codebase |
| Audit on every mutation | Resolver-level `logAudit` call |

## Junction Tables

| Table | Connects | PK |
|-------|----------|-----|
| `study_sites` | Study ↔ Site | (study_id, site_id) |
| `site_examiners` | Site ↔ Examiner | (site_id, examiner_id) |
| `study_site_examiners` | Study ↔ Site ↔ Examiner + Certificate | (study_id, site_id, examiner_id) |

## Seed Data

- 2 users: admin@sna.com (ADMIN), viewer@sna.com (VIEWER)
- 2 certificates seeded when examiners exist (one valid, one expired)
- All other data created through the admin UI

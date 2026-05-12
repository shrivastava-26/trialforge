# TrialForge — Platform Vision

## Purpose

TrialForge is a modular clinical-trial management platform built for learning and demonstration. It covers the lifecycle of a clinical study — from site selection through data capture to regulatory artifacts.
## What is TrialForge?

TrialForge is a modular clinical-trial management platform built for learning, demonstration, and eventual production readiness. It covers the end-to-end lifecycle of a clinical study — from site selection through data capture to regulatory submission artifacts.

## In-Scope (v1)

| Module | Status |
|--------|--------|| Site Network Administration (SNA) | ✅ Complete — `modules/site-network/` |
| Site Network Administration (SNA) | ✅ Imported — `modules/site-network/` |
| Identity & Access Management | 🔜 Phase 0.2 |
| Patient Registry | Planned |
| Visit Scheduling | Planned |

## Out-of-Scope (v1)

- Real regulatory submission (HL7/FHIR)
- Multi-tenant SaaS deployment
- Production infrastructure (K8s, observability)
- Real regulatory submission (HL7/FHIR integration)
- Multi-tenant SaaS deployment
- Production-grade infrastructure (Kubernetes, observability stack)
- Real patient data of any kind

## Synthetic Data Policy

All data is **synthetic/demo only**. Seed scripts generate fake but realistic data. No real PII is ever stored.

## No Hard-Delete Policy

Entities are never physically deleted. All removals follow a soft-delete/archive lifecycle:
All data in this repository is **synthetic/demo only**. No real patient, site, or investigator data is stored or referenced. Seed scripts generate fake but realistic data for development and testing.

## No Hard-Delete Policy

Entities are never physically deleted. All deletions follow a **soft-delete / archive lifecycle**:

```
ACTIVE → ARCHIVED → (purge only via explicit admin migration, never automatic)
```

This ensures full audit trail integrity.

## Phased Roadmap

| Phase | Scope |
|-------|-------|
| 0.1 | Platform scaffolding, folder structure |
| 0.1.1 | Documentation, memory bank, ADRs (this phase) |
| 0.2 | Identity module (auth, users, roles, orgs) |
| 0.1 | Platform scaffolding, docs, repo structure (this phase) |
| 0.2 | Identity module skeleton (auth, users, roles, orgs) |
| 0.3 | Patient Registry module |
| 0.4 | Visit Scheduling module |
| 0.5 | eCRF / EDC module |
| 1.0 | Integration, cross-module workflows, platform e2e |

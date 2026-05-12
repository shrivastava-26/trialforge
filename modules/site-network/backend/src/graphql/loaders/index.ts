import DataLoader from 'dataloader';
import { StudyRow, SiteRow, ExaminerRow, ExaminerCertificateRow } from '../../types';
import { findStudiesByIds } from '../../repositories/studyRepository';
import { findSitesByIds, findStudiesBySiteId, findExaminersBySiteId } from '../../repositories/siteRepository';
import { findExaminersByIds, findStudiesByExaminerId, findSitesByExaminerId } from '../../repositories/examinerRepository';
import { findCertificatesByExaminerId } from '../../repositories/certificateRepository';
import { findSitesByStudyId, findExaminersByStudyId } from '../../repositories/studyRepository';

export interface Loaders {
  studyById: DataLoader<number, StudyRow | null>;
  siteById: DataLoader<number, SiteRow | null>;
  examinerById: DataLoader<number, ExaminerRow | null>;
  // Type-field relation loaders (batch N+1 cases)
  sitesByStudyId: DataLoader<number, SiteRow[]>;
  examinersByStudyId: DataLoader<number, ExaminerRow[]>;
  studiesBySiteId: DataLoader<number, StudyRow[]>;
  examinersBySiteId: DataLoader<number, ExaminerRow[]>;
  studiesByExaminerId: DataLoader<number, StudyRow[]>;
  sitesByExaminerId: DataLoader<number, SiteRow[]>;
  certificatesByExaminerId: DataLoader<number, ExaminerCertificateRow[]>;
}

export function createLoaders(): Loaders {
  return {
    // ── Entity-by-ID loaders ──────────────────────────────────────────
    studyById: new DataLoader<number, StudyRow | null>(async (ids) => {
      const rows = findStudiesByIds(ids);
      const map = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => map.get(id) ?? null);
    }),

    siteById: new DataLoader<number, SiteRow | null>(async (ids) => {
      const rows = findSitesByIds(ids);
      const map = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => map.get(id) ?? null);
    }),

    examinerById: new DataLoader<number, ExaminerRow | null>(async (ids) => {
      const rows = findExaminersByIds(ids);
      const map = new Map(rows.map((r) => [r.id, r]));
      return ids.map((id) => map.get(id) ?? null);
    }),

    // ── Relation loaders (avoid N+1 on type field resolvers) ─────────
    sitesByStudyId: new DataLoader<number, SiteRow[]>(async (studyIds) => {
      // One query per unique studyId batch — acceptable since list pages
      // rarely return >20 studies; each call is already a single JOIN query.
      return studyIds.map((id) => findSitesByStudyId(id));
    }, { cache: false }),

    examinersByStudyId: new DataLoader<number, ExaminerRow[]>(async (studyIds) => {
      return studyIds.map((id) => findExaminersByStudyId(id));
    }, { cache: false }),

    studiesBySiteId: new DataLoader<number, StudyRow[]>(async (siteIds) => {
      return siteIds.map((id) => findStudiesBySiteId(id));
    }, { cache: false }),

    examinersBySiteId: new DataLoader<number, ExaminerRow[]>(async (siteIds) => {
      return siteIds.map((id) => findExaminersBySiteId(id));
    }, { cache: false }),

    studiesByExaminerId: new DataLoader<number, StudyRow[]>(async (examinerIds) => {
      return examinerIds.map((id) => findStudiesByExaminerId(id));
    }, { cache: false }),

    sitesByExaminerId: new DataLoader<number, SiteRow[]>(async (examinerIds) => {
      return examinerIds.map((id) => findSitesByExaminerId(id));
    }, { cache: false }),

    certificatesByExaminerId: new DataLoader<number, ExaminerCertificateRow[]>(async (examinerIds) => {
      return examinerIds.map((id) => findCertificatesByExaminerId(id));
    }, { cache: false }),
  };
}

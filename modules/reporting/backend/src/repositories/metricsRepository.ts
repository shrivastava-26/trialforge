import { queryOne } from '../db/query';
import { DashboardMetrics, MetricsFilter } from '../types';

function cnt(sql: string, params: unknown[] = []): number {
  const row = queryOne<{ c: number }>(sql, params);
  return row?.c ?? 0;
}

/**
 * Build WHERE clause fragments for study_subjects-based filtering.
 * Returns { where, params } to append to queries that join through tf_study_subjects.
 */
function ssFilter(filter: MetricsFilter, alias = 'ss'): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.studyId) { clauses.push(`${alias}.study_id = ?`); params.push(filter.studyId); }
  if (filter.siteId) { clauses.push(`${alias}.site_id = ?`); params.push(filter.siteId); }
  return { where: clauses.length ? ' AND ' + clauses.join(' AND ') : '', params };
}

export function getMetrics(filter: MetricsFilter): DashboardMetrics {
  const { where: ssWhere, params: ssParams } = ssFilter(filter);

  // Patients: total from tf_patients (no site filter possible without join)
  // If siteId/studyId provided, count distinct patient_id from tf_study_subjects
  let patientsTotal: number;
  let patientsEnrolled: number;
  let patientsArchived: number;

  if (filter.studyId || filter.siteId) {
    patientsTotal = cnt(
      `SELECT COUNT(DISTINCT ss.patient_id) as c FROM tf_study_subjects ss WHERE 1=1${ssWhere}`,
      ssParams
    );
    patientsEnrolled = cnt(
      `SELECT COUNT(*) as c FROM tf_study_subjects ss WHERE ss.status = 'ENROLLED'${ssWhere}`,
      ssParams
    );
    patientsArchived = cnt(
      `SELECT COUNT(*) as c FROM tf_study_subjects ss WHERE ss.status = 'ARCHIVED'${ssWhere}`,
      ssParams
    );
  } else {
    patientsTotal = cnt("SELECT COUNT(*) as c FROM tf_patients");
    patientsEnrolled = cnt("SELECT COUNT(*) as c FROM tf_study_subjects WHERE status = 'ENROLLED'");
    patientsArchived = cnt("SELECT COUNT(*) as c FROM tf_patients WHERE status = 'ARCHIVED'");
  }

  // Visits: join through tf_study_subjects
  const visitBase = `FROM tf_patient_visits pv JOIN tf_study_subjects ss ON pv.study_subject_id = ss.id WHERE 1=1${ssWhere}`;
  const visitsPlanned = cnt(`SELECT COUNT(*) as c ${visitBase} AND pv.status = 'PLANNED'`, ssParams);
  const visitsCompleted = cnt(`SELECT COUNT(*) as c ${visitBase} AND pv.status = 'COMPLETED'`, ssParams);
  const visitsMissed = cnt(`SELECT COUNT(*) as c ${visitBase} AND pv.status = 'MISSED'`, ssParams);

  // Forms: filter by studyId if provided (no site-level filter for forms)
  let formsActive: number;
  if (filter.studyId) {
    // tf_forms.study_id is INTEGER; study_id filter is string like "STUDY-001" → parse numeric
    const studyInt = parseStudyInt(filter.studyId);
    formsActive = cnt("SELECT COUNT(*) as c FROM tf_forms WHERE status = 'ACTIVE' AND study_id = ?", [studyInt]);
  } else {
    formsActive = cnt("SELECT COUNT(*) as c FROM tf_forms WHERE status = 'ACTIVE'");
  }

  // Form instances: join pv → ss for site/study filter
  const fiBase = `FROM tf_form_instances fi JOIN tf_patient_visits pv ON fi.patient_visit_id = pv.id JOIN tf_study_subjects ss ON pv.study_subject_id = ss.id WHERE 1=1${ssWhere}`;
  const formInstancesDraft = cnt(`SELECT COUNT(*) as c ${fiBase} AND fi.status = 'DRAFT'`, ssParams);
  const formInstancesSubmitted = cnt(`SELECT COUNT(*) as c ${fiBase} AND fi.status = 'SUBMITTED'`, ssParams);

  // Queries: join fi → pv → ss
  const qBase = `FROM tf_queries q JOIN tf_form_instances fi ON q.form_instance_id = fi.id JOIN tf_patient_visits pv ON fi.patient_visit_id = pv.id JOIN tf_study_subjects ss ON pv.study_subject_id = ss.id WHERE 1=1${ssWhere}`;
  const queriesOpen = cnt(`SELECT COUNT(*) as c ${qBase} AND q.status = 'OPEN'`, ssParams);
  const queriesAnswered = cnt(`SELECT COUNT(*) as c ${qBase} AND q.status = 'ANSWERED'`, ssParams);
  const queriesClosed = cnt(`SELECT COUNT(*) as c ${qBase} AND q.status = 'CLOSED'`, ssParams);

  // Documents: filter by studyId if provided (no site-level for docs)
  let documentsTotal: number;
  let documentsArchived: number;
  let documentVersionsTotal: number;
  if (filter.studyId) {
    const studyInt = parseStudyInt(filter.studyId);
    documentsTotal = cnt("SELECT COUNT(*) as c FROM tf_documents WHERE study_id = ?", [studyInt]);
    documentsArchived = cnt("SELECT COUNT(*) as c FROM tf_documents WHERE status = 'ARCHIVED' AND study_id = ?", [studyInt]);
    documentVersionsTotal = cnt(
      "SELECT COUNT(*) as c FROM tf_document_versions dv JOIN tf_documents d ON dv.document_id = d.id WHERE d.study_id = ?",
      [studyInt]
    );
  } else {
    documentsTotal = cnt("SELECT COUNT(*) as c FROM tf_documents");
    documentsArchived = cnt("SELECT COUNT(*) as c FROM tf_documents WHERE status = 'ARCHIVED'");
    documentVersionsTotal = cnt("SELECT COUNT(*) as c FROM tf_document_versions");
  }

  return {
    patientsTotal,
    patientsEnrolled,
    patientsArchived,
    visitsPlanned,
    visitsCompleted,
    visitsMissed,
    formsActive,
    formInstancesDraft,
    formInstancesSubmitted,
    queriesOpen,
    queriesAnswered,
    queriesClosed,
    documentsTotal,
    documentsArchived,
    documentVersionsTotal,
  };
}

/** Maps "STUDY-001" → 1 for tf_forms/tf_documents integer study_id. */
function parseStudyInt(studyId: string): number {
  const match = studyId.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

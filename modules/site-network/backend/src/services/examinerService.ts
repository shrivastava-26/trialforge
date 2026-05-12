import { GraphQLError } from 'graphql';
import { ExaminerRow, ExaminerCertificateRow, StudyRow, SiteRow } from '../types';
import {
  findExaminerById, findExaminersPaged, findStudiesByExaminerId, findSitesByExaminerId,
  examinerCodeExists, insertExaminer, updateExaminerById,
} from '../repositories/examinerRepository';
import {
  findCertificatesByExaminerId, findCertificateById, countValidCertificates,
  findDuplicateCertificate, findDuplicateCertificateExcluding,
  insertCertificate, updateCertificateById,
} from '../repositories/certificateRepository';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Examiner queries ──────────────────────────────────────────────────────

export function getExaminersPaged(page: number, pageSize: number): { rows: ExaminerRow[]; total: number } {
  return findExaminersPaged(pageSize, (page - 1) * pageSize);
}

export function getExaminerById(id: number): ExaminerRow | null {
  return findExaminerById(id);
}

export function getStudiesByExaminer(examinerId: number): StudyRow[] {
  return findStudiesByExaminerId(examinerId);
}

export function getSitesByExaminer(examinerId: number): SiteRow[] {
  return findSitesByExaminerId(examinerId);
}

// ── Examiner mutations ────────────────────────────────────────────────────

export interface CreateExaminerInput {
  examinerCode: string;
  name: string;
  specialty: string;
  email: string;
  role: string;
  status?: string;
}

export function createExaminer(input: CreateExaminerInput): ExaminerRow {
  if (examinerCodeExists(input.examinerCode)) {
    throw new GraphQLError(`Examiner code ${input.examinerCode} already exists`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const status = input.status ?? 'Active';
  const id = insertExaminer(input.examinerCode, input.name, input.specialty, input.email, input.role, status);
  return findExaminerById(id)!;
}

export interface UpdateExaminerInput {
  name?: string;
  specialty?: string;
  email?: string;
  role?: string;
  status?: string;
}

const EXAMINER_UPDATE_COLUMNS = new Set(['name', 'specialty', 'email', 'role', 'status']);

export function updateExaminer(id: number, input: UpdateExaminerInput): ExaminerRow {
  const existing = findExaminerById(id);
  if (!existing) throw new GraphQLError('Examiner not found', { extensions: { code: 'BAD_USER_INPUT' } });

  const fields = Object.entries(input).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return existing;

  const invalidKey = fields.find(([k]) => !EXAMINER_UPDATE_COLUMNS.has(k));
  if (invalidKey) throw new GraphQLError('Failed to update examiner', { extensions: { code: 'INTERNAL_SERVER_ERROR' } });

  updateExaminerById(id, fields);
  return findExaminerById(id)!;
}

// ── Certificate queries ───────────────────────────────────────────────────

export function getCertificatesByExaminer(examinerId: number): ExaminerCertificateRow[] {
  return findCertificatesByExaminerId(examinerId);
}

export function getCertificateById(id: number): ExaminerCertificateRow | null {
  return findCertificateById(id);
}

export function hasValidCertificate(examinerId: number): boolean {
  return countValidCertificates(examinerId, todayUTC()) > 0;
}

// ── Certificate mutations ─────────────────────────────────────────────────

export interface CreateCertificateInput {
  certificateId: string;
  expiresOn: string;
}

export function addExaminerCertificate(examinerId: number, input: CreateCertificateInput): ExaminerCertificateRow {
  if (!findExaminerById(examinerId)) {
    throw new GraphQLError('Examiner not found', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (findDuplicateCertificate(examinerId, input.certificateId)) {
    throw new GraphQLError('Certificate ID already exists for this examiner', {
      extensions: { code: 'BAD_USER_INPUT', fieldErrors: { certificateId: 'This certificate ID already exists for this examiner.' } },
    });
  }
  const id = insertCertificate(examinerId, input.certificateId, input.expiresOn);
  return findCertificateById(id)!;
}

export interface UpdateCertificateInput {
  certificateId?: string;
  expiresOn?: string;
}

export function updateExaminerCertificate(id: number, input: UpdateCertificateInput): ExaminerCertificateRow {
  const existing = findCertificateById(id);
  if (!existing) throw new GraphQLError('Certificate not found', { extensions: { code: 'BAD_USER_INPUT' } });

  const fields = Object.entries(input).filter(([, v]) => v !== undefined);
  if (fields.length === 0) return existing;

  if (input.certificateId && input.certificateId !== existing.certificateId) {
    if (findDuplicateCertificateExcluding(existing.examiner_id, input.certificateId, id)) {
      throw new GraphQLError('Certificate ID already exists for this examiner', {
        extensions: { code: 'BAD_USER_INPUT', fieldErrors: { certificateId: 'This certificate ID already exists for this examiner.' } },
      });
    }
  }

  updateCertificateById(id, fields);
  return findCertificateById(id)!;
}

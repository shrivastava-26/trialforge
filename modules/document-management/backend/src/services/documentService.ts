import { GraphQLError } from 'graphql';
import * as docRepo from '../repositories/documentRepository';
import * as versionRepo from '../repositories/versionRepository';
import { TfDocumentRow, TfDocumentVersionRow, DocumentStatus } from '../types';
import { throwBadUserInput } from '../validation/helpers';

// --- DTOs ---

export interface Document {
  id: number;
  studyId: number;
  title: string;
  category: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: number;
  documentId: number;
  versionNumber: number;
  fileRef: string;
  status: string;
  createdAt: string;
}

export interface DocumentWithVersions extends Document {
  versions: DocumentVersion[];
}

function toDocument(row: TfDocumentRow): Document {
  return {
    id: row.id,
    studyId: row.study_id,
    title: row.title,
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toVersion(row: TfDocumentVersionRow): DocumentVersion {
  return {
    id: row.id,
    documentId: row.document_id,
    versionNumber: row.version_number,
    fileRef: row.file_ref,
    status: row.status,
    createdAt: row.created_at,
  };
}

function requireDocExists(id: number): TfDocumentRow {
  const row = docRepo.findById(id);
  if (!row) throw new GraphQLError('Document not found', { extensions: { code: 'NOT_FOUND' } });
  return row;
}

// --- Queries ---

export function getDocumentsByStudy(
  studyId: number,
  page: number,
  pageSize: number,
  filters?: { category?: string; status?: DocumentStatus }
): { rows: Document[]; total: number } {
  const { rows, total } = docRepo.findByStudyId(studyId, page, pageSize, filters);
  return { rows: rows.map(toDocument), total };
}

export function getDocument(id: number): DocumentWithVersions {
  const row = requireDocExists(id);
  const versions = versionRepo.findByDocumentId(id).map(toVersion);
  return { ...toDocument(row), versions };
}

// --- Mutations ---

export function createDocument(studyId: number, title: string, category: string): Document {
  const id = docRepo.insert(studyId, title, category);
  return toDocument(docRepo.findById(id)!);
}

export function addDocumentVersion(documentId: number, fileRef: string): DocumentVersion {
  const doc = requireDocExists(documentId);

  if (doc.status === 'ARCHIVED') {
    throwBadUserInput(
      { documentId: 'Cannot add versions to an ARCHIVED document' },
      'Document is archived'
    );
  }

  // Supersede current ACTIVE version
  const currentActive = versionRepo.findActiveByDocumentId(documentId);
  if (currentActive) {
    versionRepo.updateStatus(currentActive.id, 'SUPERSEDED');
  }

  const nextVersion = versionRepo.getMaxVersionNumber(documentId) + 1;
  const id = versionRepo.insert(documentId, nextVersion, fileRef);
  return toVersion(versionRepo.findById(id)!);
}

export function setDocumentStatus(documentId: number, status: DocumentStatus): Document {
  const doc = requireDocExists(documentId);

  if (doc.status === 'ARCHIVED' && status !== 'ARCHIVED') {
    throwBadUserInput(
      { status: 'Cannot change status of an ARCHIVED document' },
      'Document is archived'
    );
  }

  docRepo.updateStatus(documentId, status);
  return toDocument(docRepo.findById(documentId)!);
}

export function archiveDocument(documentId: number): Document {
  const doc = requireDocExists(documentId);
  if (doc.status === 'ARCHIVED') return toDocument(doc);

  docRepo.updateStatus(documentId, 'ARCHIVED');
  versionRepo.archiveAllByDocumentId(documentId);
  return toDocument(docRepo.findById(documentId)!);
}

import { queryAll, queryOne, execute } from '../db/query';
import { TfDocumentVersionRow, VersionStatus } from '../types';

export function findById(id: number): TfDocumentVersionRow | undefined {
  return queryOne<TfDocumentVersionRow>('SELECT * FROM tf_document_versions WHERE id = ?', [id]);
}

export function findByDocumentId(documentId: number): TfDocumentVersionRow[] {
  return queryAll<TfDocumentVersionRow>(
    'SELECT * FROM tf_document_versions WHERE document_id = ? ORDER BY version_number DESC',
    [documentId]
  );
}

export function findActiveByDocumentId(documentId: number): TfDocumentVersionRow | undefined {
  return queryOne<TfDocumentVersionRow>(
    "SELECT * FROM tf_document_versions WHERE document_id = ? AND status = 'ACTIVE'",
    [documentId]
  );
}

export function getMaxVersionNumber(documentId: number): number {
  const row = queryOne<{ mv: number }>('SELECT MAX(version_number) as mv FROM tf_document_versions WHERE document_id = ?', [documentId]);
  return row?.mv ?? 0;
}

export function insert(documentId: number, versionNumber: number, fileRef: string): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_document_versions (document_id, version_number, file_ref) VALUES (?, ?, ?)',
    [documentId, versionNumber, fileRef]
  );
  return lastInsertRowid;
}

export function updateStatus(id: number, status: VersionStatus): void {
  execute('UPDATE tf_document_versions SET status = ? WHERE id = ?', [status, id]);
}

export function archiveAllByDocumentId(documentId: number): void {
  execute("UPDATE tf_document_versions SET status = 'ARCHIVED' WHERE document_id = ?", [documentId]);
}

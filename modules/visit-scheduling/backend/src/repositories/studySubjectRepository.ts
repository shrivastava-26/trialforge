import { queryOne } from '../db/query';
import { TfStudySubjectRow } from '../types';

export function findById(id: number): TfStudySubjectRow | undefined {
  return queryOne<TfStudySubjectRow>('SELECT * FROM tf_study_subjects WHERE id = ?', [id]);
}

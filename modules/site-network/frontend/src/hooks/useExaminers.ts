import { useQuery } from '@apollo/client';
import { Examiner } from '../types';
import { GET_EXAMINERS_QUERY } from '../services/examinerService';

export function useExaminers(page = 1, pageSize = 10) {
  const { data, loading, error } = useQuery(GET_EXAMINERS_QUERY, {
    variables: { page, pageSize },
  });
  const examiners: Examiner[] = data?.getExaminers?.rows ?? [];
  const total: number = data?.getExaminers?.total ?? 0;
  return { examiners, total, loading, error };
}

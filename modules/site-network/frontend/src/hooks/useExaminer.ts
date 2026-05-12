import { useQuery } from '@apollo/client';
import { Examiner } from '../types';
import { GET_EXAMINER_QUERY } from '../services/examinerService';

export function useExaminer(id: string | undefined) {
  const { data, loading, error } = useQuery(GET_EXAMINER_QUERY, {
    variables: { id },
    skip: !id,
  });
  const examiner: Examiner | null = data?.getExaminer ?? null;
  return { examiner, loading, error };
}

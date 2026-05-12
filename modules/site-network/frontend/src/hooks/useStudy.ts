import { useQuery } from '@apollo/client';
import { Study } from '../types';
import { GET_STUDY_QUERY } from '../services/studyService';

export function useStudy(id: string | undefined) {
  const { data, loading, error } = useQuery(GET_STUDY_QUERY, {
    variables: { id },
    skip: !id,
  });
  const study: Study | null = data?.getStudy ?? null;
  return { study, loading, error };
}

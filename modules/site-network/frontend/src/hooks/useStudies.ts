import { useQuery } from '@apollo/client';
import { Study } from '../types';
import { GET_STUDIES_QUERY } from '../services/studyService';

export function useStudies(page = 1, pageSize = 10) {
  const { data, loading, error } = useQuery(GET_STUDIES_QUERY, {
    variables: { page, pageSize },
  });
  const studies: Study[] = data?.getStudies?.rows ?? [];
  const total: number = data?.getStudies?.total ?? 0;
  return { studies, total, loading, error };
}

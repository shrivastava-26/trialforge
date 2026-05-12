import { useQuery } from '@apollo/client';
import { Site } from '../types';
import { GET_SITES_QUERY } from '../services/siteService';

export function useSites(page = 1, pageSize = 10) {
  const { data, loading, error } = useQuery(GET_SITES_QUERY, {
    variables: { page, pageSize },
  });
  const sites: Site[] = data?.getSites?.rows ?? [];
  const total: number = data?.getSites?.total ?? 0;
  return { sites, total, loading, error };
}

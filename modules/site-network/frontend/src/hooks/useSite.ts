import { useQuery } from '@apollo/client';
import { Site } from '../types';
import { GET_SITE_QUERY } from '../services/siteService';

export function useSite(id: string | undefined) {
  const { data, loading, error } = useQuery(GET_SITE_QUERY, {
    variables: { id },
    skip: !id,
  });
  const site: Site | null = data?.getSite ?? null;
  return { site, loading, error };
}

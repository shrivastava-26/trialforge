import { useQuery } from '@apollo/client';
import { GET_SITES_PICKER_QUERY } from '../services/studyService';

interface SitePick {
  id: string;
  siteCode: string;
  name: string;
}

export function useSitesPicker(skip = false) {
  const { data, loading } = useQuery(GET_SITES_PICKER_QUERY, { skip });
  const sites: SitePick[] = data?.getSites?.rows ?? [];
  return { sites, loading };
}

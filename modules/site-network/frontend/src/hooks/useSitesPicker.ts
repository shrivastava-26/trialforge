import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_SITES_PICKER_QUERY } from '../services/studyService';

interface SitePick {
  id: string;
  siteCode: string;
  name: string;
}

// Eager version — fires immediately (used where picker is always visible)
export function useSitesPicker(skip = false) {
  const { data, loading } = useQuery(GET_SITES_PICKER_QUERY, { skip });
  const sites: SitePick[] = data?.getSites?.rows ?? [];
  return { sites, loading };
}

// Lazy version — fires only when load() is called (used for on-demand autocompletes)
export function useSitesPickerLazy() {
  const [load, { data, loading }] = useLazyQuery(GET_SITES_PICKER_QUERY);
  const sites: SitePick[] = data?.getSites?.rows ?? [];
  return { load, sites, loading };
}

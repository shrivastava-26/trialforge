import { searchStudies, searchSites, searchExaminers } from '../repositories/searchRepository';

export interface SearchFilters {
  entityType?: 'Study' | 'Site' | 'Examiner';
  studyStatus?: string;
  studyPhase?: string;
  siteCity?: string;
  siteCountry?: string;
  examinerRole?: string;
}

export function globalSearch(keyword: string, filters: SearchFilters = {}) {
  const kw = `%${keyword.toLowerCase()}%`;
  const { entityType } = filters;

  const studies = (!entityType || entityType === 'Study')
    ? searchStudies(kw, filters.studyStatus, filters.studyPhase)
    : [];

  const sites = (!entityType || entityType === 'Site')
    ? searchSites(kw, filters.siteCity, filters.siteCountry)
    : [];

  const examiners = (!entityType || entityType === 'Examiner')
    ? searchExaminers(kw, filters.examinerRole)
    : [];

  return { studies, sites, examiners };
}

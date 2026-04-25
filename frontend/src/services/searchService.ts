import { gql } from '@apollo/client';

export const GLOBAL_SEARCH_QUERY = gql`
  query GlobalSearch($keyword: String!, $filters: SearchFilters) {
    globalSearch(keyword: $keyword, filters: $filters) {
      studies { id protocolId title sponsor phase status }
      sites   { id siteCode name city country status }
      examiners { id examinerCode name specialty role status }
    }
  }
`;

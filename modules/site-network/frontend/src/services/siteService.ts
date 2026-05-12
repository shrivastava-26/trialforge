import { gql } from '@apollo/client';

// Used by list pages — paginated, flat fields only
export const GET_SITES_QUERY = gql`
  query GetSites($page: Int, $pageSize: Int) {
    getSites(page: $page, pageSize: $pageSize) {
      total
      rows {
        id
        siteCode
        name
        city
        country
        status
      }
    }
  }
`;

// Used by detail pages — one site with its nested studies and examiners
export const GET_SITE_QUERY = gql`
  query GetSite($id: ID!) {
    getSite(id: $id) {
      id
      siteCode
      name
      city
      country
      status
      studies { id protocolId title status }
      examiners { id examinerCode name specialty role status }
    }
  }
`;

// Used by assignment pickers — fetch all with large pageSize, minimal fields only
export const GET_EXAMINERS_PICKER_QUERY = gql`
  query GetExaminersPicker {
    getExaminers(pageSize: 1000) {
      rows {
        id
        examinerCode
        name
        role
      }
    }
  }
`;

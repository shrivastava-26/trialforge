import { gql } from '@apollo/client';

// Used by list pages — paginated, flat fields only
export const GET_STUDIES_QUERY = gql`
  query GetStudies($page: Int, $pageSize: Int) {
    getStudies(page: $page, pageSize: $pageSize) {
      total
      rows {
        id
        protocolId
        title
        sponsor
        phase
        startDate
        endDate
        status
        description
      }
    }
  }
`;

// Used by detail pages — one study with its nested sites, studySites, and examiners
export const GET_STUDY_QUERY = gql`
  query GetStudy($id: ID!) {
    getStudy(id: $id) {
      id
      protocolId
      title
      sponsor
      phase
      startDate
      endDate
      status
      description
      sites { id siteCode name city country status }
      examiners { id examinerCode name specialty role status }
      studySites {
        site { id siteCode name city country status }
        examiners { id examinerCode name specialty role status certificate { id certificateId expiresOn } }
        availableExaminers { id examinerCode name specialty role status certificates { id certificateId expiresOn } }
      }
    }
  }
`;

// Used by assignment pickers — fetch all with large pageSize, minimal fields only
export const GET_SITES_PICKER_QUERY = gql`
  query GetSitesPicker {
    getSites(pageSize: 1000) {
      rows {
        id
        siteCode
        name
      }
    }
  }
`;

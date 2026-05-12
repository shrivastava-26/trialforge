import { gql } from '@apollo/client';

// Used by list pages — paginated, flat fields only
export const GET_EXAMINERS_QUERY = gql`
  query GetExaminers($page: Int, $pageSize: Int) {
    getExaminers(page: $page, pageSize: $pageSize) {
      total
      rows {
        id
        examinerCode
        name
        specialty
        email
        role
        status
      }
    }
  }
`;

// Used by detail pages — one examiner with its nested studies and sites
export const GET_EXAMINER_QUERY = gql`
  query GetExaminer($id: ID!) {
    getExaminer(id: $id) {
      id
      examinerCode
      name
      specialty
      email
      role
      status
      studies { id protocolId title sponsor phase status }
      sites { id siteCode name city country status }
      certificates { id certificateId expiresOn }
    }
  }
`;

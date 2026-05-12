export const searchSchema = `#graphql
  type SearchResults {
    studies: [Study!]!
    sites: [Site!]!
    examiners: [Examiner!]!
  }

  input SearchFilters {
    entityType: String
    studyStatus: String
    studyPhase: String
    siteCity: String
    siteCountry: String
    examinerRole: String
  }

  extend type Query {
    globalSearch(keyword: String!, filters: SearchFilters): SearchResults!
  }
`;

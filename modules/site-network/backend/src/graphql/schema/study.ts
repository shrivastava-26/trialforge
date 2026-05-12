export const studySchema = `#graphql
  # Per-study, per-site examiner with linked certificate
  type StudySiteExaminer {
    id: ID!
    examinerCode: String!
    name: String!
    specialty: String!
    email: String!
    role: String!
    status: String!
    certificate: ExaminerCertificate
  }

  # Per-study, per-site examiner breakdown
  type StudySite {
    site: Site!
    examiners: [StudySiteExaminer!]!   # assigned to THIS study at THIS site (with certificate)
    availableExaminers: [Examiner!]!   # all examiners on the site (for admin picker)
  }

  type Study {
    id: ID!
    protocolId: String!
    title: String!
    sponsor: String!
    phase: String!
    startDate: String!
    endDate: String!
    status: String!
    description: String!
    sites: [Site!]!
    # Union of examiners assigned via study_site_examiners across all sites
    examiners: [Examiner!]!
    # Per-site breakdown with subset examiners
    studySites: [StudySite!]!
  }

  type StudyPage {
    rows: [Study!]!
    total: Int!
  }

  input CreateStudyInput {
    protocolId: String!
    title: String!
    sponsor: String!
    phase: String!
    startDate: String!
    endDate: String
    description: String
  }

  input UpdateStudyInput {
    title: String
    sponsor: String
    phase: String
    startDate: String
    endDate: String
    status: String
    description: String
  }

  extend type Query {
    getStudy(id: ID!): Study
    getStudies(page: Int, pageSize: Int): StudyPage!
  }

  extend type Mutation {
    createStudy(input: CreateStudyInput!): Study!
    updateStudy(id: ID!, input: UpdateStudyInput!): Study!
    assignSiteToStudy(studyId: ID!, siteId: ID!): Boolean!
    unassignSiteFromStudy(studyId: ID!, siteId: ID!): Boolean!
    assignExaminerToStudySite(studyId: ID!, siteId: ID!, examinerId: ID!, certificateId: ID): Boolean!
    unassignExaminerFromStudySite(studyId: ID!, siteId: ID!, examinerId: ID!): Boolean!
  }
`;

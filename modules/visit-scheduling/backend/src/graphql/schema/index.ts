export const typeDefs = `#graphql
  enum VisitTemplateStatus {
    ACTIVE
    ARCHIVED
  }

  enum PatientVisitStatus {
    PLANNED
    COMPLETED
    MISSED
    CANCELLED
    ARCHIVED
  }

  type VisitTemplate {
    id: Int!
    studyId: Int!
    name: String!
    dayOffset: Int!
    windowMinDays: Int!
    windowMaxDays: Int!
    status: VisitTemplateStatus!
  }

  type PatientVisit {
    id: Int!
    studySubjectId: Int!
    visitTemplateId: Int!
    scheduledDate: String!
    completedDate: String
    status: PatientVisitStatus!
  }

  type VisitTemplatePage {
    rows: [VisitTemplate!]!
    total: Int!
  }

  type PatientVisitPage {
    rows: [PatientVisit!]!
    total: Int!
  }

  input CreateVisitTemplateInput {
    name: String!
    dayOffset: Int!
    windowMinDays: Int
    windowMaxDays: Int
  }

  input UpdateVisitTemplateInput {
    name: String
    dayOffset: Int
    windowMinDays: Int
    windowMaxDays: Int
  }

  type Query {
    getVisitTemplates(studyId: Int!, page: Int, pageSize: Int): VisitTemplatePage!
    getPatientVisits(studySubjectId: Int!, page: Int, pageSize: Int): PatientVisitPage!
    getPatientVisit(id: Int!): PatientVisit!
  }

  type Mutation {
    createVisitTemplate(studyId: Int!, input: CreateVisitTemplateInput!): VisitTemplate!
    updateVisitTemplate(id: Int!, input: UpdateVisitTemplateInput!): VisitTemplate!
    archiveVisitTemplate(id: Int!): VisitTemplate!
    schedulePatientVisit(studySubjectId: Int!, visitTemplateId: Int!, scheduledDate: String!): PatientVisit!
    completePatientVisit(id: Int!, completedDate: String!): PatientVisit!
    updatePatientVisitStatus(id: Int!, status: PatientVisitStatus!): PatientVisit!
    archivePatientVisit(id: Int!): PatientVisit!
  }
`;

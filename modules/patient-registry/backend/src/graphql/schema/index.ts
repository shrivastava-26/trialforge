export const typeDefs = `#graphql
  enum PatientStatus {
    SCREENED
    ELIGIBLE
    ENROLLED
    WITHDRAWN
    COMPLETED
    ARCHIVED
  }

  type Patient {
    id: Int!
    subjectId: String!
    status: PatientStatus!
    createdAt: String!
    updatedAt: String!
  }

  type PatientWithAssignments {
    id: Int!
    subjectId: String!
    status: PatientStatus!
    createdAt: String!
    updatedAt: String!
    assignments: [StudySubject!]!
  }

  type StudySubject {
    id: Int!
    studyId: String!
    siteId: String!
    patientId: Int!
    status: PatientStatus!
    assignedAt: String!
  }

  type PatientPage {
    rows: [Patient!]!
    total: Int!
  }

  type StudySubjectPage {
    rows: [StudySubject!]!
    total: Int!
  }

  input PatientFilters {
    status: PatientStatus
  }

  input CreatePatientInput {
    subjectId: String!
  }

  input UpdatePatientInput {
    subjectId: String
    status: PatientStatus
  }

  type Query {
    getPatients(page: Int, pageSize: Int, filters: PatientFilters): PatientPage!
    getPatient(id: Int!): PatientWithAssignments!
    getStudySubjects(studyId: String!, siteId: String, page: Int, pageSize: Int): StudySubjectPage!
  }

  type Mutation {
    createPatient(input: CreatePatientInput!): Patient!
    updatePatient(id: Int!, input: UpdatePatientInput!): Patient!
    assignPatientToStudySite(patientId: Int!, studyId: String!, siteId: String!): StudySubject!
    updateStudySubjectStatus(id: Int!, status: PatientStatus!): StudySubject!
    archivePatient(id: Int!): Patient!
  }
`;

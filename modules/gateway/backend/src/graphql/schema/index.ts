export const typeDefs = `#graphql
  type User {
    id: ID!
    email: String!
    role: String!
  }

  type AuthPayload {
    user: User!
  }

  type DashboardMetrics {
    patientsTotal: Int!
    patientsEnrolled: Int!
    patientsArchived: Int!
    visitsPlanned: Int!
    visitsCompleted: Int!
    visitsMissed: Int!
    formsActive: Int!
    formInstancesDraft: Int!
    formInstancesSubmitted: Int!
    queriesOpen: Int!
    queriesAnswered: Int!
    queriesClosed: Int!
    documentsTotal: Int!
    documentsArchived: Int!
    documentVersionsTotal: Int!
  }

  # Patient Registry
  type Patient {
    id: ID!
    studyId: ID!
    siteId: ID!
    subjectNumber: String!
    status: String!
    enrolledAt: String
  }

  # Form Builder
  type Form {
    id: ID!
    title: String!
    version: Int!
    status: String!
    fields: String
  }

  # Query Management
  type DataQuery {
    id: ID!
    formInstanceId: ID!
    fieldName: String!
    status: String!
    message: String!
    createdAt: String!
  }

  # Document Management
  type Document {
    id: ID!
    title: String!
    category: String!
    status: String!
    uploadedAt: String!
  }

  input PatientInput {
    studyId: ID!
    siteId: ID!
    subjectNumber: String!
  }

  input FormInput {
    title: String!
    fields: String!
  }

  input DataQueryInput {
    formInstanceId: ID!
    fieldName: String!
    message: String!
  }

  input DocumentInput {
    title: String!
    category: String!
  }

  type Query {
    me: User
    getDashboardMetrics(studyId: ID, siteId: ID): DashboardMetrics!

    # Patient Registry
    patients(studyId: ID!, siteId: ID): [Patient!]!
    patient(id: ID!): Patient

    # Form Builder
    forms(studyId: ID): [Form!]!
    form(id: ID!): Form

    # Query Management
    dataQueries(formInstanceId: ID, status: String): [DataQuery!]!
    dataQuery(id: ID!): DataQuery

    # Document Management
    documents(category: String, status: String): [Document!]!
    document(id: ID!): Document
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshSession: Boolean!

    # Patient Registry
    createPatient(input: PatientInput!): Patient!
    updatePatientStatus(id: ID!, status: String!): Patient!

    # Form Builder
    createForm(input: FormInput!): Form!
    publishForm(id: ID!): Form!

    # Query Management
    createDataQuery(input: DataQueryInput!): DataQuery!
    answerDataQuery(id: ID!, answer: String!): DataQuery!
    closeDataQuery(id: ID!): DataQuery!

    # Document Management
    uploadDocument(input: DocumentInput!): Document!
    archiveDocument(id: ID!): Document!
  }
`;

export const examinerSchema = `#graphql
  type ExaminerCertificate {
    id: ID!
    certificateId: String!
    expiresOn: String!
  }

  type Examiner {
    id: ID!
    examinerCode: String!
    name: String!
    specialty: String!
    email: String!
    role: String!
    status: String!
    studies: [Study!]!
    sites: [Site!]!
    certificates: [ExaminerCertificate!]!
  }

  type ExaminerPage {
    rows: [Examiner!]!
    total: Int!
  }

  input CreateExaminerInput {
    examinerCode: String!
    name: String!
    specialty: String!
    email: String!
    role: String!
    status: String
  }

  input UpdateExaminerInput {
    name: String
    specialty: String
    email: String
    role: String
    status: String
  }

  input CreateExaminerCertificateInput {
    certificateId: String!
    expiresOn: String!
  }

  input UpdateExaminerCertificateInput {
    certificateId: String
    expiresOn: String
  }

  extend type Query {
    getExaminer(id: ID!): Examiner
    getExaminers(page: Int, pageSize: Int): ExaminerPage!
  }

  extend type Mutation {
    createExaminer(input: CreateExaminerInput!): Examiner!
    updateExaminer(id: ID!, input: UpdateExaminerInput!): Examiner!
    addExaminerCertificate(examinerId: ID!, input: CreateExaminerCertificateInput!): ExaminerCertificate!
    updateExaminerCertificate(id: ID!, input: UpdateExaminerCertificateInput!): ExaminerCertificate!
  }
`;

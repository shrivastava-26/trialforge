export const typeDefs = `#graphql
  enum FormInstanceStatus {
    DRAFT
    SUBMITTED
    ARCHIVED
  }

  type FormInstance {
    id: Int!
    patientVisitId: Int!
    formId: Int!
    status: FormInstanceStatus!
    createdAt: String!
    updatedAt: String!
  }

  type FormResponse {
    id: Int!
    formInstanceId: Int!
    responseJson: String!
    savedAt: String!
    submittedAt: String
  }

  type FormInstanceWithResponse {
    id: Int!
    patientVisitId: Int!
    formId: Int!
    status: FormInstanceStatus!
    createdAt: String!
    updatedAt: String!
    response: FormResponse
  }

  type Query {
    getFormInstancesByVisit(patientVisitId: Int!): [FormInstance!]!
    getFormInstance(id: Int!): FormInstanceWithResponse!
  }

  type Mutation {
    createFormInstance(patientVisitId: Int!): FormInstance!
    saveFormResponse(formInstanceId: Int!, responseJson: String!): FormInstanceWithResponse!
    submitFormInstance(formInstanceId: Int!): FormInstanceWithResponse!
    archiveFormInstance(formInstanceId: Int!): FormInstance!
  }
`;

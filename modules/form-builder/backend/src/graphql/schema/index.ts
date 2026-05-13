export const typeDefs = `#graphql
  enum FormStatus {
    DRAFT
    ACTIVE
    ARCHIVED
  }

  enum FieldType {
    TEXT
    NUMBER
    DATE
    DROPDOWN
    RADIO
    CHECKBOX
    TEXTAREA
  }

  type Form {
    id: Int!
    studyId: Int!
    name: String!
    version: Int!
    status: FormStatus!
    createdAt: String!
    updatedAt: String!
  }

  type FormWithFields {
    id: Int!
    studyId: Int!
    name: String!
    version: Int!
    status: FormStatus!
    createdAt: String!
    updatedAt: String!
    fields: [FormField!]!
  }

  type FormField {
    id: Int!
    formId: Int!
    fieldKey: String!
    label: String!
    fieldType: FieldType!
    required: Boolean!
    optionsJson: String
    displayOrder: Int!
  }

  type FormPage {
    rows: [Form!]!
    total: Int!
  }

  input AddFieldInput {
    fieldKey: String!
    label: String!
    fieldType: FieldType!
    required: Boolean
    optionsJson: String
    displayOrder: Int
  }

  input UpdateFieldInput {
    label: String
    fieldType: FieldType
    required: Boolean
    optionsJson: String
    displayOrder: Int
  }

  type Query {
    getForms(studyId: Int!, page: Int, pageSize: Int): FormPage!
    getForm(id: Int!): FormWithFields!
  }

  type Mutation {
    createForm(studyId: Int!, name: String!): Form!
    addField(formId: Int!, input: AddFieldInput!): FormField!
    updateField(fieldId: Int!, input: UpdateFieldInput!): FormField!
    publishForm(formId: Int!): Form!
    createNewFormVersion(formId: Int!): FormWithFields!
    archiveForm(formId: Int!): Form!
  }
`;

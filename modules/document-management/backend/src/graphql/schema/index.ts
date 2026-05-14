export const typeDefs = `#graphql
  enum DocumentStatus {
    DRAFT
    ACTIVE
    ARCHIVED
  }

  enum VersionStatus {
    ACTIVE
    SUPERSEDED
    ARCHIVED
  }

  enum DocumentCategory {
    Protocol
    ICF
    TMF
    Other
  }

  type Document {
    id: Int!
    studyId: Int!
    title: String!
    category: String!
    status: DocumentStatus!
    createdAt: String!
    updatedAt: String!
  }

  type DocumentVersion {
    id: Int!
    documentId: Int!
    versionNumber: Int!
    fileRef: String!
    status: VersionStatus!
    createdAt: String!
  }

  type DocumentWithVersions {
    id: Int!
    studyId: Int!
    title: String!
    category: String!
    status: DocumentStatus!
    createdAt: String!
    updatedAt: String!
    versions: [DocumentVersion!]!
  }

  type DocumentPage {
    rows: [Document!]!
    total: Int!
  }

  input DocumentFilters {
    category: DocumentCategory
    status: DocumentStatus
  }

  type Query {
    getDocumentsByStudy(studyId: Int!, page: Int, pageSize: Int, filters: DocumentFilters): DocumentPage!
    getDocument(id: Int!): DocumentWithVersions!
  }

  type Mutation {
    createDocument(studyId: Int!, title: String!, category: DocumentCategory!): Document!
    addDocumentVersion(documentId: Int!, fileRef: String!): DocumentVersion!
    setDocumentStatus(documentId: Int!, status: DocumentStatus!): Document!
    archiveDocument(documentId: Int!): Document!
  }
`;

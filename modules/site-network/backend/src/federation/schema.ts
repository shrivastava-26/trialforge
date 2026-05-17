import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { resolvers } from '../graphql/resolvers';

/**
 * Federation-compatible schema for site-network subgraph.
 * Annotates User, Site, and Study with @key for entity resolution.
 * All existing resolvers are preserved.
 */
const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    email: String!
    role: String!
  }

  type AuthPayload {
    user: User!
  }

  type Site @key(fields: "id") {
    id: ID!
    siteCode: String!
    name: String!
    city: String!
    country: String!
    status: String!
    studies: [Study!]!
    examiners: [Examiner!]!
  }

  type SitePage {
    rows: [Site!]!
    total: Int!
  }

  type Study @key(fields: "id") {
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
    examiners: [Examiner!]!
    studySites: [StudySite!]!
  }

  type StudyPage {
    rows: [Study!]!
    total: Int!
  }

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

  type StudySite {
    site: Site!
    examiners: [StudySiteExaminer!]!
    availableExaminers: [Examiner!]!
  }

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

  input CreateSiteInput {
    siteCode: String!
    name: String!
    city: String!
    country: String!
    status: String
  }

  input UpdateSiteInput {
    name: String
    city: String
    country: String
    status: String
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

  type AuditLog {
    id: ID!
    actorUserId: Int!
    actorEmail: String!
    action: String!
    entityType: String!
    entityId: Int!
    beforeJson: String
    afterJson: String
    createdAt: String!
  }

  type AuditLogPage {
    rows: [AuditLog!]!
    total: Int!
  }

  type Query {
    me: User
    getSite(id: ID!): Site
    getSites(page: Int, pageSize: Int): SitePage!
    getStudy(id: ID!): Study
    getStudies(page: Int, pageSize: Int): StudyPage!
    getExaminer(id: ID!): Examiner
    getExaminers(page: Int, pageSize: Int): ExaminerPage!
    globalSearch(keyword: String!, filters: SearchFilters): SearchResults!
    getAuditLogs(entityType: String, entityTypes: [String!], entityId: Int, page: Int, pageSize: Int): AuditLogPage!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!
    refreshSession: Boolean!
    createSite(input: CreateSiteInput!): Site!
    updateSite(id: ID!, input: UpdateSiteInput!): Site!
    assignExaminerToSite(siteId: ID!, examinerId: ID!): Boolean!
    unassignExaminerFromSite(siteId: ID!, examinerId: ID!): Boolean!
    createStudy(input: CreateStudyInput!): Study!
    updateStudy(id: ID!, input: UpdateStudyInput!): Study!
    assignSiteToStudy(studyId: ID!, siteId: ID!): Boolean!
    unassignSiteFromStudy(studyId: ID!, siteId: ID!): Boolean!
    assignExaminerToStudySite(studyId: ID!, siteId: ID!, examinerId: ID!, certificateId: ID): Boolean!
    unassignExaminerFromStudySite(studyId: ID!, siteId: ID!, examinerId: ID!): Boolean!
    createExaminer(input: CreateExaminerInput!): Examiner!
    updateExaminer(id: ID!, input: UpdateExaminerInput!): Examiner!
    addExaminerCertificate(examinerId: ID!, input: CreateExaminerCertificateInput!): ExaminerCertificate!
    updateExaminerCertificate(id: ID!, input: UpdateExaminerCertificateInput!): ExaminerCertificate!
  }
`;

// Entity resolvers for federation __resolveReference
const federationResolvers = {
  ...resolvers,
  User: {
    __resolveReference(ref: { id: string }) {
      const { getUserById } = require('../services/authService');
      return getUserById(Number(ref.id));
    },
  },
  Site: {
    ...(resolvers as Record<string, unknown>).Site,
    __resolveReference(ref: { id: string }) {
      const { findSiteById } = require('../repositories/siteRepository');
      return findSiteById(Number(ref.id));
    },
  },
  Study: {
    ...(resolvers as Record<string, unknown>).Study,
    __resolveReference(ref: { id: string }) {
      const { findStudyById } = require('../repositories/studyRepository');
      return findStudyById(Number(ref.id));
    },
  },
};

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: federationResolvers as never,
});

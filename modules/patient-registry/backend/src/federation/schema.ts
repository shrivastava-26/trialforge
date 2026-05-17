import gql from 'graphql-tag';
import { buildSubgraphSchema } from '@apollo/subgraph';
import * as patientService from '../services/patientService';
import { requireAuth } from '../graphql/resolvers/helpers';
import { GraphQLContext } from '../types';

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  enum PatientStatus {
    SCREENED
    ELIGIBLE
    ENROLLED
    WITHDRAWN
    COMPLETED
    ARCHIVED
  }

  type Patient @key(fields: "id") {
    id: ID!
    subjectId: String!
    status: PatientStatus!
    createdAt: String!
    updatedAt: String!
  }

  type StudySubject @key(fields: "id") {
    id: ID!
    studyId: ID!
    siteId: ID!
    patientId: ID!
    status: PatientStatus!
    assignedAt: String!
    patient: Patient!
  }

  type StudySubjectPage {
    rows: [StudySubject!]!
    total: Int!
  }

  type Study @key(fields: "id") {
    id: ID! @external
    subjects(page: Int, pageSize: Int, status: String): StudySubjectPage!
  }

  type Site @key(fields: "id") {
    id: ID! @external
    subjects(page: Int, pageSize: Int, status: String): StudySubjectPage!
  }

  type Query {
    _patientRegistryHealth: String!
  }
`;

const resolvers = {
  Query: {
    _patientRegistryHealth: () => 'ok',
  },
  Study: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
    subjects(
      parent: { id: string },
      args: { page?: number; pageSize?: number; status?: string },
      context: GraphQLContext
    ) {
      requireAuth(context);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      return patientService.getStudySubjects(parent.id, undefined, page, pageSize);
    },
  },
  Site: {
    __resolveReference(ref: { id: string }) {
      return { id: ref.id };
    },
    subjects(
      parent: { id: string },
      args: { page?: number; pageSize?: number; status?: string },
      context: GraphQLContext
    ) {
      requireAuth(context);
      const page = args.page ?? 1;
      const pageSize = args.pageSize ?? 20;
      // Use a dummy studyId filter — site-level query filters by siteId across all studies
      return patientService.getStudySubjectsBySite(parent.id, page, pageSize);
    },
  },
  Patient: {
    __resolveReference(ref: { id: string }) {
      const patient = patientService.getPatient(Number(ref.id));
      return patient;
    },
  },
  StudySubject: {
    __resolveReference(ref: { id: string }) {
      return patientService.getStudySubjectById(Number(ref.id));
    },
    patient(parent: { patientId: number }) {
      return patientService.getPatient(parent.patientId);
    },
  },
};

export const schema = buildSubgraphSchema({
  typeDefs,
  resolvers: resolvers as never,
});

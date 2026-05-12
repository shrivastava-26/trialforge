import { gql } from '@apollo/client';

// Study mutations
export const CREATE_STUDY_MUTATION = gql`
  mutation CreateStudy($input: CreateStudyInput!) {
    createStudy(input: $input) { id protocolId title sponsor phase startDate endDate status description }
  }
`;

export const UPDATE_STUDY_MUTATION = gql`
  mutation UpdateStudy($id: ID!, $input: UpdateStudyInput!) {
    updateStudy(id: $id, input: $input) { id protocolId title sponsor phase startDate endDate status description }
  }
`;

export const ASSIGN_SITE_TO_STUDY = gql`
  mutation AssignSiteToStudy($studyId: ID!, $siteId: ID!) {
    assignSiteToStudy(studyId: $studyId, siteId: $siteId)
  }
`;

export const UNASSIGN_SITE_FROM_STUDY = gql`
  mutation UnassignSiteFromStudy($studyId: ID!, $siteId: ID!) {
    unassignSiteFromStudy(studyId: $studyId, siteId: $siteId)
  }
`;

export const ASSIGN_EXAMINER_TO_STUDY_SITE = gql`
  mutation AssignExaminerToStudySite($studyId: ID!, $siteId: ID!, $examinerId: ID!, $certificateId: ID) {
    assignExaminerToStudySite(studyId: $studyId, siteId: $siteId, examinerId: $examinerId, certificateId: $certificateId)
  }
`;

export const UNASSIGN_EXAMINER_FROM_STUDY_SITE = gql`
  mutation UnassignExaminerFromStudySite($studyId: ID!, $siteId: ID!, $examinerId: ID!) {
    unassignExaminerFromStudySite(studyId: $studyId, siteId: $siteId, examinerId: $examinerId)
  }
`;

// Site mutations
export const CREATE_SITE_MUTATION = gql`
  mutation CreateSite($input: CreateSiteInput!) {
    createSite(input: $input) { id siteCode name city country status }
  }
`;

export const UPDATE_SITE_MUTATION = gql`
  mutation UpdateSite($id: ID!, $input: UpdateSiteInput!) {
    updateSite(id: $id, input: $input) { id siteCode name city country status }
  }
`;

export const ASSIGN_EXAMINER_TO_SITE = gql`
  mutation AssignExaminerToSite($siteId: ID!, $examinerId: ID!) {
    assignExaminerToSite(siteId: $siteId, examinerId: $examinerId)
  }
`;

export const UNASSIGN_EXAMINER_FROM_SITE = gql`
  mutation UnassignExaminerFromSite($siteId: ID!, $examinerId: ID!) {
    unassignExaminerFromSite(siteId: $siteId, examinerId: $examinerId)
  }
`;

// Examiner mutations
export const CREATE_EXAMINER_MUTATION = gql`
  mutation CreateExaminer($input: CreateExaminerInput!) {
    createExaminer(input: $input) { id examinerCode name specialty email role status }
  }
`;

export const UPDATE_EXAMINER_MUTATION = gql`
  mutation UpdateExaminer($id: ID!, $input: UpdateExaminerInput!) {
    updateExaminer(id: $id, input: $input) { id examinerCode name specialty email role status }
  }
`;

export const ADD_EXAMINER_CERTIFICATE_MUTATION = gql`
  mutation AddExaminerCertificate($examinerId: ID!, $input: CreateExaminerCertificateInput!) {
    addExaminerCertificate(examinerId: $examinerId, input: $input) { id certificateId expiresOn }
  }
`;

export const UPDATE_EXAMINER_CERTIFICATE_MUTATION = gql`
  mutation UpdateExaminerCertificate($id: ID!, $input: UpdateExaminerCertificateInput!) {
    updateExaminerCertificate(id: $id, input: $input) { id certificateId expiresOn }
  }
`;

// Search query moved to services/searchService.ts

// Audit logs
export const GET_AUDIT_LOGS_QUERY = gql`
  query GetAuditLogs($entityType: String, $entityTypes: [String!], $entityId: Int, $page: Int, $pageSize: Int) {
    getAuditLogs(entityType: $entityType, entityTypes: $entityTypes, entityId: $entityId, page: $page, pageSize: $pageSize) {
      total
      rows {
        id actorEmail action entityType entityId beforeJson afterJson createdAt
      }
    }
  }
`;

import { GraphQLError } from 'graphql';
import { GraphQLContext, StudyRow } from '../../types';
import {
  getStudiesPaged, getStudyById, getSitesByStudy, getExaminersByStudy,
  getStudySitesWithStudyExaminers,
  assignExaminerToStudySite, unassignExaminerFromStudySite,
  createStudy, updateStudy, assignSiteToStudy, unassignSiteFromStudy,
  CreateStudyInput, UpdateStudyInput,
} from '../../services/studyService';
import { requireAuth, requireAdmin, logAudit } from './helpers';
import {
  parseOrThrow, createStudySchema, updateStudySchema,
  assignmentSchema, idSchema, studySiteExaminerSchema, pickerPaginationSchema,
} from '../../validation';

export const studyResolvers = {
  Query: {
    getStudies(_: unknown, args: { page?: number; pageSize?: number }, context: GraphQLContext) {
      requireAuth(context);
      const { page, pageSize } = parseOrThrow(pickerPaginationSchema, { page: args.page ?? 1, pageSize: args.pageSize ?? 10 });
      return getStudiesPaged(page, pageSize);
    },
    getStudy(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      requireAuth(context);
      parseOrThrow(idSchema, id);
      return getStudyById(Number(id));
    },
  },

  Mutation: {
    createStudy(_: unknown, { input }: { input: CreateStudyInput }, context: GraphQLContext) {
      requireAdmin(context);
      const validated = parseOrThrow(createStudySchema, input);
      const study = createStudy(validated as CreateStudyInput);
      logAudit(context, 'CREATE', 'Study', study.id, null, JSON.stringify(study));
      return study;
    },

    updateStudy(_: unknown, { id, input }: { id: string; input: UpdateStudyInput }, context: GraphQLContext) {
      requireAdmin(context);
      parseOrThrow(idSchema, id);
      const validated = parseOrThrow(updateStudySchema, input);
      const before = getStudyById(Number(id));
      const study = updateStudy(Number(id), validated as UpdateStudyInput);
      logAudit(context, 'UPDATE', 'Study', study.id, JSON.stringify(before), JSON.stringify(study));
      return study;
    },

    assignSiteToStudy(_: unknown, { studyId, siteId }: { studyId: string; siteId: string }, context: GraphQLContext) {
      requireAdmin(context);
      parseOrThrow(assignmentSchema, { studyId, siteId });
      assignSiteToStudy(Number(studyId), Number(siteId));
      logAudit(context, 'ASSIGN', 'StudySite', Number(studyId), null, JSON.stringify({ studyId: Number(studyId), siteId: Number(siteId) }));
      return true;
    },

    unassignSiteFromStudy(_: unknown, { studyId, siteId }: { studyId: string; siteId: string }, context: GraphQLContext) {
      requireAdmin(context);
      parseOrThrow(assignmentSchema, { studyId, siteId });
      unassignSiteFromStudy(Number(studyId), Number(siteId));
      logAudit(context, 'UNASSIGN', 'StudySite', Number(studyId), JSON.stringify({ studyId: Number(studyId), siteId: Number(siteId) }), null);
      return true;
    },

    assignExaminerToStudySite(
      _: unknown,
      { studyId, siteId, examinerId, certificateId }: { studyId: string; siteId: string; examinerId: string; certificateId?: string },
      context: GraphQLContext
    ) {
      requireAdmin(context);
      parseOrThrow(studySiteExaminerSchema, { studyId, siteId, examinerId, ...(certificateId ? { certificateId } : {}) });
      assignExaminerToStudySite(Number(studyId), Number(siteId), Number(examinerId), certificateId ? Number(certificateId) : undefined);
      logAudit(context, 'ASSIGN', 'StudySiteExaminer', Number(studyId), null, JSON.stringify({ studyId: Number(studyId), siteId: Number(siteId), examinerId: Number(examinerId), ...(certificateId ? { certificateId: Number(certificateId) } : {}) }));
      return true;
    },

    unassignExaminerFromStudySite(
      _: unknown,
      { studyId, siteId, examinerId }: { studyId: string; siteId: string; examinerId: string },
      context: GraphQLContext
    ) {
      requireAdmin(context);
      parseOrThrow(studySiteExaminerSchema, { studyId, siteId, examinerId });
      unassignExaminerFromStudySite(Number(studyId), Number(siteId), Number(examinerId));
      logAudit(context, 'UNASSIGN', 'StudySiteExaminer', Number(studyId), JSON.stringify({ studyId: Number(studyId), siteId: Number(siteId), examinerId: Number(examinerId) }), null);
      return true;
    },
  },

  Study: {
    sites(parent: StudyRow, _: unknown, context: GraphQLContext) { return context.loaders.sitesByStudyId.load(parent.id); },
    examiners(parent: StudyRow, _: unknown, context: GraphQLContext) { return context.loaders.examinersByStudyId.load(parent.id); },
    studySites(parent: StudyRow) { return getStudySitesWithStudyExaminers(parent.id); },
  },
};

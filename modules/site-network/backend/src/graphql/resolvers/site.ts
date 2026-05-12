import { GraphQLContext, SiteRow } from '../../types';
import {
  getSitesPaged, getSiteById, getStudiesBySite, getExaminersBySite,
  createSite, updateSite, assignExaminerToSite, unassignExaminerFromSite,
  CreateSiteInput, UpdateSiteInput,
} from '../../services/siteService';
import { requireAuth, requireAdmin, logAudit } from './helpers';
import {
  parseOrThrow, createSiteSchema, updateSiteSchema,
  siteExaminerSchema, idSchema, pickerPaginationSchema,
} from '../../validation';

export const siteResolvers = {
  Query: {
    getSites(_: unknown, args: { page?: number; pageSize?: number }, context: GraphQLContext) {
      requireAuth(context);
      const { page, pageSize } = parseOrThrow(pickerPaginationSchema, { page: args.page ?? 1, pageSize: args.pageSize ?? 10 });
      return getSitesPaged(page, pageSize);
    },
    getSite(_: unknown, { id }: { id: string }, context: GraphQLContext) {
      requireAuth(context);
      parseOrThrow(idSchema, id);
      return getSiteById(Number(id));
    },
  },

  Mutation: {
    createSite(_: unknown, { input }: { input: CreateSiteInput }, context: GraphQLContext) {
      requireAdmin(context);
      const validated = parseOrThrow(createSiteSchema, input);
      const site = createSite(validated as CreateSiteInput);
      logAudit(context, 'CREATE', 'Site', site.id, null, JSON.stringify(site));
      return site;
    },

    updateSite(_: unknown, { id, input }: { id: string; input: UpdateSiteInput }, context: GraphQLContext) {
      requireAdmin(context);
      parseOrThrow(idSchema, id);
      const validated = parseOrThrow(updateSiteSchema, input);
      const before = getSiteById(Number(id));
      const site = updateSite(Number(id), validated as UpdateSiteInput);
      logAudit(context, 'UPDATE', 'Site', site.id, JSON.stringify(before), JSON.stringify(site));
      return site;
    },

    assignExaminerToSite(_: unknown, { siteId, examinerId }: { siteId: string; examinerId: string }, context: GraphQLContext) {
      requireAdmin(context);
      parseOrThrow(siteExaminerSchema, { siteId, examinerId });
      assignExaminerToSite(Number(siteId), Number(examinerId));
      logAudit(context, 'ASSIGN', 'SiteExaminer', Number(siteId), null, JSON.stringify({ siteId: Number(siteId), examinerId: Number(examinerId) }));
      return true;
    },

    unassignExaminerFromSite(_: unknown, { siteId, examinerId }: { siteId: string; examinerId: string }, context: GraphQLContext) {
      requireAdmin(context);
      parseOrThrow(siteExaminerSchema, { siteId, examinerId });
      unassignExaminerFromSite(Number(siteId), Number(examinerId));
      logAudit(context, 'UNASSIGN', 'SiteExaminer', Number(siteId), JSON.stringify({ siteId: Number(siteId), examinerId: Number(examinerId) }), null);
      return true;
    },
  },

  Site: {
    studies(parent: SiteRow, _: unknown, context: GraphQLContext) { return context.loaders.studiesBySiteId.load(parent.id); },
    examiners(parent: SiteRow, _: unknown, context: GraphQLContext) { return context.loaders.examinersBySiteId.load(parent.id); },
  },
};

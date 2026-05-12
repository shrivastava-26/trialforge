import { authResolvers } from './auth';
import { studyResolvers } from './study';
import { siteResolvers } from './site';
import { examinerResolvers } from './examiner';
import { searchResolvers } from './search';
import { auditResolvers } from './audit';

export const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...studyResolvers.Query,
    ...siteResolvers.Query,
    ...examinerResolvers.Query,
    ...searchResolvers.Query,
    ...auditResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...studyResolvers.Mutation,
    ...siteResolvers.Mutation,
    ...examinerResolvers.Mutation,
  },
  Study: studyResolvers.Study,
  Site: siteResolvers.Site,
  Examiner: examinerResolvers.Examiner,
};

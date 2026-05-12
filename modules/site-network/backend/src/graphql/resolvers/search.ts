import { GraphQLContext } from '../../types';
import { globalSearch, SearchFilters } from '../../services/searchService';
import { requireAuth } from './helpers';
import { parseOrThrow, searchSchema } from '../../validation';

export const searchResolvers = {
  Query: {
    globalSearch(_: unknown, { keyword, filters }: { keyword: string; filters?: SearchFilters }, context: GraphQLContext) {
      requireAuth(context);
      parseOrThrow(searchSchema, { keyword, filters });
      return globalSearch(keyword, filters ?? {});
    },
  },
};

import { GraphQLContext, RoleName } from '../../types';
import { requireAuth, requireRole } from './helpers';
import { parseOrThrow } from '../../validation/helpers';
import { createUserSchema, updateUserSchema, paginationSchema } from '../../validation/schemas';
import * as userService from '../../services/userService';

export const resolvers = {
  Query: {
    getUsers: (_: unknown, args: { page?: number; pageSize?: number }, context: GraphQLContext) => {
      requireAuth(context);
      const { page, pageSize } = parseOrThrow(paginationSchema, {
        page: args.page ?? 1,
        pageSize: args.pageSize ?? 20,
      });
      return userService.getUsers(page, pageSize);
    },

    getUser: (_: unknown, args: { id: number }, context: GraphQLContext) => {
      requireAuth(context);
      return userService.getUser(args.id);
    },

    me: (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.user) return null;
      return userService.getUser(context.user.userId);
    },
  },

  Mutation: {
    createUser: (_: unknown, args: { input: unknown }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      const input = parseOrThrow(createUserSchema, args.input);
      return userService.createUser(input.email, input.password, input.roles);
    },

    updateUser: (_: unknown, args: { id: number; input: unknown }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      const input = parseOrThrow(updateUserSchema, args.input);
      return userService.updateUser(args.id, input);
    },

    assignRoleToUser: (_: unknown, args: { userId: number; role: RoleName }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return userService.assignRoleToUser(args.userId, args.role);
    },

    unassignRoleFromUser: (_: unknown, args: { userId: number; role: RoleName }, context: GraphQLContext) => {
      requireRole(context, 'ADMIN');
      return userService.unassignRoleFromUser(args.userId, args.role);
    },
  },
};

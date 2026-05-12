import { authSchema } from './auth';
import { studySchema } from './study';
import { siteSchema } from './site';
import { examinerSchema } from './examiner';
import { searchSchema } from './search';
import { auditSchema } from './audit';

export const typeDefs = [authSchema, studySchema, siteSchema, examinerSchema, searchSchema, auditSchema];

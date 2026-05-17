import { forwardOperation } from '../../services/proxy';
import { getModuleUrl } from '../../services/moduleProxyService';
import { requireAuth, requireRole } from '../../services/authService';
import { getDashboardMetrics } from '../../services/reportingService';
import { logRequest } from '../../services/logger';
import type { GatewayContext } from '../../types';

function withLogging<T>(
  operationName: string,
  ctx: GatewayContext,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  return fn()
    .then((result) => {
      logRequest({ operationName, userId: ctx.user?.id, executionTimeMs: Date.now() - start });
      return result;
    })
    .catch((err: Error) => {
      logRequest({ operationName, userId: ctx.user?.id, executionTimeMs: Date.now() - start, error: err.message });
      throw err;
    });
}

export const resolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: GatewayContext) =>
      withLogging('me', ctx, async () => {
        const data = await forwardOperation({
          url: getModuleUrl('siteNetwork'),
          query: `query { me { id email role } }`,
          req: ctx.req,
          res: ctx.res,
        });
        return data.me;
      }),

    getDashboardMetrics: (_: unknown, args: { studyId?: string; siteId?: string }, ctx: GatewayContext) =>
      withLogging('getDashboardMetrics', ctx, async () => {
        requireAuth(ctx);
        return getDashboardMetrics(args, ctx);
      }),

    // Patient Registry
    patients: (_: unknown, args: { studyId: string; siteId?: string }, ctx: GatewayContext) =>
      withLogging('patients', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('patientRegistry'),
          query: `query($studyId: ID!, $siteId: ID) { patients(studyId: $studyId, siteId: $siteId) { id studyId siteId subjectNumber status enrolledAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.patients;
      }),

    patient: (_: unknown, args: { id: string }, ctx: GatewayContext) =>
      withLogging('patient', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('patientRegistry'),
          query: `query($id: ID!) { patient(id: $id) { id studyId siteId subjectNumber status enrolledAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.patient;
      }),

    // Form Builder
    forms: (_: unknown, args: { studyId?: string }, ctx: GatewayContext) =>
      withLogging('forms', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('formBuilder'),
          query: `query($studyId: ID) { forms(studyId: $studyId) { id title version status fields } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.forms;
      }),

    form: (_: unknown, args: { id: string }, ctx: GatewayContext) =>
      withLogging('form', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('formBuilder'),
          query: `query($id: ID!) { form(id: $id) { id title version status fields } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.form;
      }),

    // Query Management
    dataQueries: (_: unknown, args: { formInstanceId?: string; status?: string }, ctx: GatewayContext) =>
      withLogging('dataQueries', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('queryManagement'),
          query: `query($formInstanceId: ID, $status: String) { dataQueries(formInstanceId: $formInstanceId, status: $status) { id formInstanceId fieldName status message createdAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.dataQueries;
      }),

    dataQuery: (_: unknown, args: { id: string }, ctx: GatewayContext) =>
      withLogging('dataQuery', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('queryManagement'),
          query: `query($id: ID!) { dataQuery(id: $id) { id formInstanceId fieldName status message createdAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.dataQuery;
      }),

    // Document Management
    documents: (_: unknown, args: { category?: string; status?: string }, ctx: GatewayContext) =>
      withLogging('documents', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('documentManagement'),
          query: `query($category: String, $status: String) { documents(category: $category, status: $status) { id title category status uploadedAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.documents;
      }),

    document: (_: unknown, args: { id: string }, ctx: GatewayContext) =>
      withLogging('document', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('documentManagement'),
          query: `query($id: ID!) { document(id: $id) { id title category status uploadedAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.document;
      }),
  },

  Mutation: {
    login: (_: unknown, args: { email: string; password: string }, ctx: GatewayContext) =>
      withLogging('login', ctx, async () => {
        const data = await forwardOperation({
          url: getModuleUrl('siteNetwork'),
          query: `mutation($email: String!, $password: String!) { login(email: $email, password: $password) { user { id email role } } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.login;
      }),

    logout: (_: unknown, __: unknown, ctx: GatewayContext) =>
      withLogging('logout', ctx, async () => {
        const data = await forwardOperation({
          url: getModuleUrl('siteNetwork'),
          query: `mutation { logout }`,
          req: ctx.req,
          res: ctx.res,
        });
        return data.logout;
      }),

    refreshSession: (_: unknown, __: unknown, ctx: GatewayContext) =>
      withLogging('refreshSession', ctx, async () => {
        const data = await forwardOperation({
          url: getModuleUrl('siteNetwork'),
          query: `mutation { refreshSession }`,
          req: ctx.req,
          res: ctx.res,
        });
        return data.refreshSession;
      }),

    // Patient Registry - requires ADMIN or STUDY_MANAGER
    createPatient: (_: unknown, args: { input: unknown }, ctx: GatewayContext) =>
      withLogging('createPatient', ctx, async () => {
        requireRole(ctx, ['ADMIN', 'STUDY_MANAGER', 'SITE_COORDINATOR']);
        const data = await forwardOperation({
          url: getModuleUrl('patientRegistry'),
          query: `mutation($input: PatientInput!) { createPatient(input: $input) { id studyId siteId subjectNumber status enrolledAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.createPatient;
      }),

    updatePatientStatus: (_: unknown, args: { id: string; status: string }, ctx: GatewayContext) =>
      withLogging('updatePatientStatus', ctx, async () => {
        requireRole(ctx, ['ADMIN', 'STUDY_MANAGER', 'SITE_COORDINATOR']);
        const data = await forwardOperation({
          url: getModuleUrl('patientRegistry'),
          query: `mutation($id: ID!, $status: String!) { updatePatientStatus(id: $id, status: $status) { id studyId siteId subjectNumber status enrolledAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.updatePatientStatus;
      }),

    // Form Builder - ADMIN or STUDY_MANAGER only
    createForm: (_: unknown, args: { input: unknown }, ctx: GatewayContext) =>
      withLogging('createForm', ctx, async () => {
        requireRole(ctx, ['ADMIN', 'STUDY_MANAGER']);
        const data = await forwardOperation({
          url: getModuleUrl('formBuilder'),
          query: `mutation($input: FormInput!) { createForm(input: $input) { id title version status fields } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.createForm;
      }),

    publishForm: (_: unknown, args: { id: string }, ctx: GatewayContext) =>
      withLogging('publishForm', ctx, async () => {
        requireRole(ctx, ['ADMIN', 'STUDY_MANAGER']);
        const data = await forwardOperation({
          url: getModuleUrl('formBuilder'),
          query: `mutation($id: ID!) { publishForm(id: $id) { id title version status fields } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.publishForm;
      }),

    // Query Management
    createDataQuery: (_: unknown, args: { input: unknown }, ctx: GatewayContext) =>
      withLogging('createDataQuery', ctx, async () => {
        requireRole(ctx, ['ADMIN', 'STUDY_MANAGER']);
        const data = await forwardOperation({
          url: getModuleUrl('queryManagement'),
          query: `mutation($input: DataQueryInput!) { createDataQuery(input: $input) { id formInstanceId fieldName status message createdAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.createDataQuery;
      }),

    answerDataQuery: (_: unknown, args: { id: string; answer: string }, ctx: GatewayContext) =>
      withLogging('answerDataQuery', ctx, async () => {
        requireAuth(ctx);
        const data = await forwardOperation({
          url: getModuleUrl('queryManagement'),
          query: `mutation($id: ID!, $answer: String!) { answerDataQuery(id: $id, answer: $answer) { id formInstanceId fieldName status message createdAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.answerDataQuery;
      }),

    closeDataQuery: (_: unknown, args: { id: string }, ctx: GatewayContext) =>
      withLogging('closeDataQuery', ctx, async () => {
        requireRole(ctx, ['ADMIN', 'STUDY_MANAGER']);
        const data = await forwardOperation({
          url: getModuleUrl('queryManagement'),
          query: `mutation($id: ID!) { closeDataQuery(id: $id) { id formInstanceId fieldName status message createdAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.closeDataQuery;
      }),

    // Document Management
    uploadDocument: (_: unknown, args: { input: unknown }, ctx: GatewayContext) =>
      withLogging('uploadDocument', ctx, async () => {
        requireRole(ctx, ['ADMIN', 'STUDY_MANAGER']);
        const data = await forwardOperation({
          url: getModuleUrl('documentManagement'),
          query: `mutation($input: DocumentInput!) { uploadDocument(input: $input) { id title category status uploadedAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.uploadDocument;
      }),

    archiveDocument: (_: unknown, args: { id: string }, ctx: GatewayContext) =>
      withLogging('archiveDocument', ctx, async () => {
        requireRole(ctx, ['ADMIN']);
        const data = await forwardOperation({
          url: getModuleUrl('documentManagement'),
          query: `mutation($id: ID!) { archiveDocument(id: $id) { id title category status uploadedAt } }`,
          variables: args,
          req: ctx.req,
          res: ctx.res,
        });
        return data.archiveDocument;
      }),
  },
};

const urls = {
  siteNetwork: () => process.env.SITE_NETWORK_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
  reporting: () => process.env.REPORTING_GRAPHQL_URL ?? 'http://localhost:4120/graphql',
  patientRegistry: () => process.env.PATIENT_REGISTRY_GRAPHQL_URL ?? 'http://localhost:4010/graphql',
  formBuilder: () => process.env.FORM_BUILDER_GRAPHQL_URL ?? 'http://localhost:4020/graphql',
  queryManagement: () => process.env.QUERY_MANAGEMENT_GRAPHQL_URL ?? 'http://localhost:4030/graphql',
  documentManagement: () => process.env.DOCUMENT_MANAGEMENT_GRAPHQL_URL ?? 'http://localhost:4040/graphql',
} as const;

export type ModuleName = keyof typeof urls;

export function getModuleUrl(module: ModuleName): string {
  return urls[module]();
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_GRAPHQL_URL: string;
  readonly VITE_REPORTING_GRAPHQL_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

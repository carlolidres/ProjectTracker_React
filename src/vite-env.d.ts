/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_BASE_PATH: string;
  /** Optional override; CI sets branch/ref name. Defaults to package.json via Vite define. */
  readonly VITE_APP_VERSION?: string;
  /** Optional override; CI sets github.sha. Defaults to local git short SHA via Vite define. */
  readonly VITE_APP_GIT_SHA?: string;
}

declare const __APP_VERSION__: string;
declare const __APP_GIT_SHA__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Supabase project URL (public). */
  readonly PUBLIC_SUPABASE_URL: string;
  /** Supabase anon key (public; data guarded by RLS). */
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  /** Supabase service-role key (SECRET — server only). */
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Server-only Supabase admin client — uses the SERVICE-ROLE key, which
 * bypasses Row-Level Security. NEVER import this from client-side code; it must
 * only run inside API routes / server endpoints (serverless functions).
 *
 * Used for privileged actions the anon client shouldn't do directly, e.g.
 * creating a customer order and reading it back by code.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseAdmin(): SupabaseClient {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

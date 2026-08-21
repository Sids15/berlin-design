/**
 * Browser Supabase client — uses the PUBLIC anon key. Safe to ship to the
 * client; every table is guarded by Row-Level Security. Used for authenticated
 * staff reads/writes and for the kitchen board's realtime subscription.
 *
 * Lazy singleton so a missing env var can't throw at module import time.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (!client) {
    client = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    );
  }
  return client;
}

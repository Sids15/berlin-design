/**
 * POST /api/auth/logout — sign the staff member out. signOut() clears the
 * session cookies via the SSR client; we then redirect to the login page.
 */
import type { APIRoute } from "astro";
import { supabaseServer } from "../../../lib/supabase/server";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = supabaseServer(context);
  await supabase.auth.signOut();
  return context.redirect("/staff/login", 303);
};

/**
 * POST /api/auth/login — staff sign-in. Takes an email + password form post,
 * signs in with Supabase (which writes the session cookies via the SSR client),
 * then redirects to the requested page. On failure, bounces back to the login
 * page with an error flag. Creates its own request-scoped client so the auth
 * cookies land on this response.
 */
import type { APIRoute } from "astro";
import { supabaseServer } from "../../../lib/supabase/server";
import { safeNext } from "../../../lib/http/safe-next";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));

  if (!email || !password) {
    return context.redirect(loginUrl(next, "missing"), 303);
  }

  const supabase = supabaseServer(context);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return context.redirect(loginUrl(next, "invalid"), 303);
  }

  return context.redirect(next, 303);
};

function loginUrl(next: string, err: string): string {
  const q = new URLSearchParams({ next, error: err });
  return `/staff/login?${q.toString()}`;
}

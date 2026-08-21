import { defineMiddleware } from "astro:middleware";
import { supabaseServer } from "./lib/supabase/server";
import { loadStaff } from "./lib/auth/session";

/**
 * Guards the staff-facing surfaces. Every request gets a request-scoped Supabase
 * client on `locals`. For paths that need a staff session (the protected pages
 * and the staff/logout APIs) we verify the session and load the profile:
 *   • protected *pages* with no valid staff session → redirect to the login page
 *   • protected *APIs* → left for the endpoint to 401/403 via requireStaff()
 * Marketing and customer routes stay open and skip the auth round-trip.
 */
const PROTECTED = ["/staff", "/kitchen", "/admin"];
const PUBLIC_WITHIN = ["/staff/login"];
const SESSION_APIS = ["/api/staff", "/api/auth/logout"];

const underAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/"));

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const supabase = supabaseServer(context);
  context.locals.supabase = supabase;
  context.locals.user = null;
  context.locals.profile = null;

  const protectedPage =
    underAny(pathname, PROTECTED) && !PUBLIC_WITHIN.includes(pathname);
  const sessionApi = underAny(pathname, SESSION_APIS);

  if (protectedPage || sessionApi) {
    const { user, profile } = await loadStaff(supabase);
    context.locals.user = user;
    context.locals.profile = profile;

    // Pages redirect to login; APIs fall through and answer with JSON 401/403.
    if (protectedPage && !profile) {
      const next = encodeURIComponent(pathname + context.url.search);
      return context.redirect(`/staff/login?next=${next}`, 302);
    }
  }

  return next();
});

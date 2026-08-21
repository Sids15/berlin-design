import { defineMiddleware } from "astro:middleware";

/**
 * Guards the staff-facing surfaces. The actual Supabase session + role check is
 * wired in Feature 4 (auth); for now this establishes the protected paths and
 * passes through. Customer and marketing routes are always open.
 */
const PROTECTED = ["/staff", "/kitchen", "/admin"];
const PUBLIC_WITHIN = ["/staff/login"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const needsAuth =
    PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) &&
    !PUBLIC_WITHIN.some((p) => pathname === p);

  // Feature 4: if (needsAuth) verify the Supabase session + role here and
  // redirect to /staff/login when missing. Placeholder until then.
  void needsAuth;

  return next();
});

/**
 * Staff session helpers, shared by the middleware and the staff API routes.
 *
 * `loadStaff` turns a request-scoped Supabase client into a verified auth user
 * plus their staff profile (role). `requireStaff` is the endpoint-side guard:
 * it returns the staff context or a ready-to-return JSON error Response.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Role } from "../types";

export interface StaffContext {
  user: User;
  profile: { id: string; name: string; role: Role };
}

/**
 * Verify the session and load the staff profile. Returns nulls when there's no
 * valid session or the user isn't staff. Uses getUser() (not getSession) so the
 * JWT is validated against the auth server, not just read from the cookie.
 */
export async function loadStaff(
  supabase: SupabaseClient,
): Promise<{ user: User | null; profile: StaffContext["profile"] | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return { user, profile: null };
  return { user, profile: data as StaffContext["profile"] };
}

/**
 * Endpoint guard. Reads the staff context that middleware placed on `locals`;
 * on failure returns a JSON Response the route can return directly. Pass
 * `roles` to restrict to specific roles (e.g. who may confirm an order).
 */
export function requireStaff(
  locals: App.Locals,
  roles?: Role[],
): StaffContext | Response {
  if (!locals.user || !locals.profile) {
    return json({ error: "Not signed in." }, 401);
  }
  if (roles && !roles.includes(locals.profile.role)) {
    return json({ error: "Not permitted for your role." }, 403);
  }
  return { user: locals.user, profile: locals.profile };
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

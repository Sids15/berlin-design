/**
 * Customer table sessions. A guest's device is bound to a tab by an httpOnly
 * cookie holding the tab's secret session token. Ordering follows the session
 * (not a guessable URL), and closing a tab clears its token — killing every
 * bound device. All lookups use the service-role client; customers have no RLS
 * access to tabs.
 */
import type { AstroCookies } from "astro";
import { supabaseAdmin } from "../supabase/admin";
import { openOrJoinTab, type OpenTab } from "./tabs";

export const TAB_COOKIE = "berlin_tab";
const MAX_AGE = 60 * 60 * 8; // 8 hours — a dining session

export interface TabSession {
  tabId: string;
  table_label: string;
}

/** The OPEN tab bound to this device's cookie, or null (missing/closed/stale). */
export async function currentSession(cookies: AstroCookies): Promise<TabSession | null> {
  const token = cookies.get(TAB_COOKIE)?.value;
  if (!token) return null;

  const { data } = await supabaseAdmin()
    .from("tabs")
    .select("id, table_label, status")
    .eq("session_token", token)
    .eq("status", "open")
    .maybeSingle();

  if (!data) return null;
  return { tabId: data.id as string, table_label: data.table_label as string };
}

function setTabCookie(cookies: AstroCookies, token: string): void {
  cookies.set(TAB_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: import.meta.env.PROD,
    maxAge: MAX_AGE,
  });
}

export type MenuAccess =
  | { mode: "ok"; table: string | null }
  | { mode: "elsewhere"; table: string };

/**
 * Decide what a guest sees at /menu or /menu/<table>:
 *  • already bound to an open tab for this table (or browsing /menu) → serve it
 *  • bound to a different table → "you're seated at Table X" (no ordering here)
 *  • not bound + a table in the URL → open/join it, set the cookie, serve it
 */
export async function resolveMenuAccess(
  cookies: AstroCookies,
  urlTable: string | null,
): Promise<MenuAccess> {
  const session = await currentSession(cookies);

  if (session) {
    if (!urlTable || session.table_label === urlTable) {
      return { mode: "ok", table: session.table_label };
    }
    return { mode: "elsewhere", table: session.table_label };
  }

  if (urlTable) {
    const tab: OpenTab | null = await openOrJoinTab(supabaseAdmin(), urlTable);
    if (tab) {
      setTabCookie(cookies, tab.token);
      return { mode: "ok", table: tab.table_label };
    }
  }

  return { mode: "ok", table: null }; // bare /menu, no session — browse only
}

import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, ownerId } from "./supabase/admin";
import { isValidSession, SESSION_COOKIE } from "./session";

/** For route handlers: a valid app session plus the owner's id, or a 401 response to return */
export async function requireUser(): Promise<
  { ok: true; user: { id: string }; supabase: SupabaseClient } | { ok: false; response: NextResponse }
> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(cookie))) {
    return { ok: false, response: NextResponse.json({ error: "לא מחובר" }, { status: 401 }) };
  }
  const supabase = createAdminClient();
  return { ok: true, user: { id: await ownerId(supabase) }, supabase };
}

export function errorResponse(err: unknown, status = 502) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: message }, { status });
}

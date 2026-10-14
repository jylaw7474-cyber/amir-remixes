import "server-only";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { isAllowedEmail } from "./allowlist";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** For route handlers: the signed-in, allow-listed user, or a 401/403 response to return */
export async function requireUser(): Promise<
  { ok: true; user: User; supabase: Supabase } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { ok: false, response: NextResponse.json({ error: "לא מחובר" }, { status: 401 }) };
  }
  if (!isAllowedEmail(data.user.email)) {
    return { ok: false, response: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }) };
  }
  return { ok: true, user: data.user, supabase };
}

export function errorResponse(err: unknown, status = 502) {
  const message = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: message }, { status });
}

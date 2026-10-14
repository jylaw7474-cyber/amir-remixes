import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/** Server-only client with the secret key: bypasses RLS, so only use behind requireSession */
export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(supabaseUrl(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let ownerIdCache: string | null = null;

/**
 * tracks.user_id still points at auth.users, so every track belongs to one owner account:
 * the first ALLOWED_EMAILS address, found or created once (no email is sent).
 */
export async function ownerId(admin: SupabaseClient): Promise<string> {
  if (ownerIdCache) return ownerIdCache;
  const email = (process.env.ALLOWED_EMAILS ?? "").split(",")[0]?.trim().toLowerCase() || "owner@amir-remixes.local";

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return (ownerIdCache = found.id);
    if (data.users.length < 100) break;
  }

  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(error?.message ?? "could not create owner");
  return (ownerIdCache = data.user.id);
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "tracks";
const SIGNED_URL_SECONDS = 60 * 60 * 6;

/**
 * Copy Mureka's audio into our private bucket, so the library keeps working after
 * Mureka's links expire. Best effort: a file that fails to copy is skipped and the
 * caller keeps Mureka's URL for it.
 */
export async function copyToStorage(
  supabase: SupabaseClient,
  userId: string,
  trackId: string,
  urls: string[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const [i, url] of urls.entries()) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const path = `${userId}/${trackId}/${i + 1}.mp3`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, await res.arrayBuffer(), { contentType: "audio/mpeg", upsert: true });
      if (!error) paths.push(path);
    } catch {
      // keep going; this choice stays on Mureka's URL
    }
  }
  return paths;
}

export async function signedUrls(supabase: SupabaseClient, paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u);
}

export async function removeFromStorage(supabase: SupabaseClient, paths: string[]) {
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);
}

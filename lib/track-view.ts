import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Track, TrackView } from "./tracks";
import { signedUrls } from "./storage";

/** Prefer our stored copies; fall back to Mureka's URLs until the copy exists */
export async function toView(supabase: SupabaseClient, track: Track): Promise<TrackView> {
  const stored = await signedUrls(supabase, track.storage_paths);
  return { ...track, playUrls: stored.length > 0 ? stored : track.source_urls };
}

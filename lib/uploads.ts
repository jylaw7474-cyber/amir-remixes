import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadFileFromUrl, type UploadPurpose } from "./mureka";

const BUCKET = "tracks";

/**
 * The browser puts the user's audio in <user_id>/uploads/ of our private bucket.
 * Check the path really is theirs, then give Mureka a short-lived link to fetch it.
 */
export async function sendUploadToMureka(
  supabase: SupabaseClient,
  userId: string,
  path: string,
  purpose: UploadPurpose,
): Promise<string> {
  if (!isOwnUploadPath(userId, path)) throw new Error("קובץ לא תקין");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
  if (error || !data) throw new Error("הקובץ לא נמצא. תעלה אותו שוב");
  return uploadFileFromUrl(data.signedUrl, purpose);
}

export function isOwnUploadPath(userId: string, path: string): boolean {
  return path.startsWith(`${userId}/uploads/`) && !path.includes("..");
}

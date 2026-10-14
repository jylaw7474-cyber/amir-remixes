import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";

const EXTENSIONS = ["mp3", "m4a"];

/** A one-time signed upload slot in the owner's uploads folder, so big files skip our server */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const ext = typeof body.ext === "string" ? body.ext.toLowerCase() : "";
  if (!EXTENSIONS.includes(ext)) return NextResponse.json({ error: "רק קבצי MP3 או M4A" }, { status: 400 });

  const path = `${auth.user.id}/uploads/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await auth.supabase.storage.from("tracks").createSignedUploadUrl(path);
  if (error || !data) return errorResponse(error?.message ?? "upload slot failed", 500);
  return NextResponse.json({ path: data.path, token: data.token });
}

import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";
import type { Track } from "@/lib/tracks";
import { toView } from "@/lib/track-view";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabase
    .from("tracks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Track[]>();

  if (error) return errorResponse(error.message, 500);
  return NextResponse.json(await Promise.all((data ?? []).map((t) => toView(auth.supabase, t))));
}

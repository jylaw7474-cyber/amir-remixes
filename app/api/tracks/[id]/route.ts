import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";
import { FINAL_STATUSES, queryTask, type TaskStatus } from "@/lib/mureka";
import { copyToStorage, removeFromStorage } from "@/lib/storage";
import type { Track } from "@/lib/tracks";
import { toView } from "@/lib/track-view";

/** Returns the track, first asking Mureka for progress if it is still running */
export async function GET(_request: Request, ctx: RouteContext<"/api/tracks/[id]">) {
  const { id } = await ctx.params;
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { data: track } = await supabase.from("tracks").select("*").eq("id", id).single<Track>();
  if (!track) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  if (FINAL_STATUSES.includes(track.status as TaskStatus)) {
    return NextResponse.json(await toView(supabase, track));
  }

  let result;
  try {
    result = await queryTask(track.task_kind, track.task_id);
  } catch (err) {
    return errorResponse(err);
  }

  const update: Partial<Track> & { updated_at: string } = {
    status: result.status,
    failed_reason: result.failedReason ?? null,
    updated_at: new Date().toISOString(),
  };
  if (result.status === "succeeded") {
    update.source_urls = result.audioUrls;
    update.choice_ids = result.choiceIds;
    update.storage_paths = await copyToStorage(supabase, user.id, track.id, result.audioUrls);
  }

  const { data: updated, error } = await supabase
    .from("tracks")
    .update(update)
    .eq("id", id)
    .select()
    .single<Track>();
  if (error || !updated) return errorResponse(error?.message ?? "עדכון נכשל", 500);

  return NextResponse.json(await toView(supabase, updated));
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/tracks/[id]">) {
  const { id } = await ctx.params;
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { data: track } = await auth.supabase.from("tracks").select("*").eq("id", id).single<Track>();
  if (!track) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  await removeFromStorage(auth.supabase, track.storage_paths);
  const { error } = await auth.supabase.from("tracks").delete().eq("id", id);
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ ok: true });
}

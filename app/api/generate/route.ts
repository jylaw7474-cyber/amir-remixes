import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";
import { startEasySong, startExtend, startInstrumental, startSong } from "@/lib/mureka";
import type { Mode, Track } from "@/lib/tracks";
import { toView } from "@/lib/track-view";
import { LIMITS, text } from "@/lib/validate";

const MODES: Mode[] = ["easy", "song", "instrumental", "extend"];

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { user, supabase } = auth;

  const body = await request.json().catch(() => ({}));
  const mode = body.mode as Mode;
  if (!MODES.includes(mode)) return NextResponse.json({ error: "מצב לא מוכר" }, { status: 400 });

  const prompt = text(body.prompt, LIMITS.prompt);
  const lyrics = text(body.lyrics, LIMITS.lyrics);
  const title = text(body.title, LIMITS.title) || null;
  const songId = text(body.songId, 200);

  let taskId: string;
  try {
    if (mode === "easy") {
      if (!prompt) return NextResponse.json({ error: "צריך תיאור לשיר" }, { status: 400 });
      taskId = await startEasySong(prompt);
    } else if (mode === "song") {
      if (!lyrics) return NextResponse.json({ error: "צריך מילים לשיר" }, { status: 400 });
      taskId = await startSong(lyrics, prompt);
    } else if (mode === "instrumental") {
      if (!prompt) return NextResponse.json({ error: "צריך תיאור לקטע" }, { status: 400 });
      taskId = await startInstrumental(prompt);
    } else {
      if (!songId) return NextResponse.json({ error: "צריך לבחור שיר להארכה" }, { status: 400 });
      taskId = await startExtend(songId, lyrics);
    }
  } catch (err) {
    return errorResponse(err);
  }

  const { data, error } = await supabase
    .from("tracks")
    .insert({
      user_id: user.id,
      mode,
      task_kind: mode === "instrumental" ? "instrumental" : "song",
      task_id: taskId,
      title,
      prompt: prompt || null,
      lyrics: lyrics || null,
    })
    .select()
    .single<Track>();

  if (error || !data) return errorResponse(error?.message ?? "שמירה נכשלה", 500);
  return NextResponse.json(await toView(supabase, data));
}

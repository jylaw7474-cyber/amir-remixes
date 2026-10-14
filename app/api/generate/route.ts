import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";
import { startEasySong, startExtend, startInstrumental, startRemix, startSong } from "@/lib/mureka";
import type { Mode, Track } from "@/lib/tracks";
import { toView } from "@/lib/track-view";
import { sendUploadToMureka } from "@/lib/uploads";
import { LIMITS, text } from "@/lib/validate";

const MODES: Mode[] = ["easy", "song", "instrumental", "extend", "remix"];

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
  // Audio the user uploaded to our bucket: the remix source, or a style reference for "song"
  const uploadPath = text(body.uploadPath, 300);
  if (uploadPath && body.rightsConfirmed !== true) {
    return NextResponse.json({ error: "צריך לאשר שיש לך זכות להשתמש בשיר" }, { status: 400 });
  }

  let taskId: string;
  try {
    if (mode === "easy") {
      if (!prompt) return NextResponse.json({ error: "צריך תיאור לשיר" }, { status: 400 });
      taskId = await startEasySong(prompt);
    } else if (mode === "song") {
      if (!lyrics) return NextResponse.json({ error: "צריך מילים לשיר" }, { status: 400 });
      const referenceId = uploadPath
        ? await sendUploadToMureka(supabase, user.id, uploadPath, "reference")
        : undefined;
      taskId = await startSong(lyrics, prompt, referenceId);
    } else if (mode === "instrumental") {
      if (!prompt) return NextResponse.json({ error: "צריך תיאור לקטע" }, { status: 400 });
      taskId = await startInstrumental(prompt);
    } else if (mode === "extend") {
      if (!songId) return NextResponse.json({ error: "צריך לבחור שיר להארכה" }, { status: 400 });
      taskId = await startExtend(songId, lyrics);
    } else {
      if (!prompt) return NextResponse.json({ error: "צריך לתאר איך הרימיקס ישמע" }, { status: 400 });
      if (uploadPath) {
        const uploadId = await sendUploadToMureka(supabase, user.id, uploadPath, "remix");
        taskId = await startRemix({ uploadId }, prompt);
      } else if (songId) {
        taskId = await startRemix({ songId }, prompt);
      } else {
        return NextResponse.json({ error: "צריך להעלות שיר או לבחור שיר מהספרייה" }, { status: 400 });
      }
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
      upload_path: uploadPath || null,
    })
    .select()
    .single<Track>();

  if (error || !data) return errorResponse(error?.message ?? "שמירה נכשלה", 500);
  return NextResponse.json(await toView(supabase, data));
}

import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";
import { collectUrls, stemSong } from "@/lib/mureka";
import { text } from "@/lib/validate";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const url = text(body.url, 2000);
  if (!/^https:\/\//.test(url)) return NextResponse.json({ error: "צריך קישור https לשיר" }, { status: 400 });

  try {
    const result = await stemSong(url);
    return NextResponse.json({ urls: [...new Set(collectUrls(result))] });
  } catch (err) {
    return errorResponse(err);
  }
}

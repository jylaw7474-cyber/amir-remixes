import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/auth";
import { extendLyrics, generateLyrics } from "@/lib/mureka";
import { LIMITS, text } from "@/lib/validate";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "extend" ? "extend" : "generate";
  const input = text(body.text, mode === "extend" ? LIMITS.lyrics : LIMITS.prompt);
  if (!input) return NextResponse.json({ error: "צריך טקסט" }, { status: 400 });

  try {
    const result = mode === "extend" ? await extendLyrics(input) : await generateLyrics(input);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

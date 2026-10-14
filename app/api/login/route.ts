import { NextResponse } from "next/server";
import { appPassword, safeEqual, SESSION_COOKIE, SESSION_MAX_AGE, sessionToken } from "@/lib/session";

export async function POST(request: Request) {
  const expected = appPassword();
  if (!expected) {
    return NextResponse.json({ error: "APP_PASSWORD לא מוגדר ב-Vercel" }, { status: 500 });
  }
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!safeEqual(password, expected)) {
    return NextResponse.json({ error: "סיסמה לא נכונה" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

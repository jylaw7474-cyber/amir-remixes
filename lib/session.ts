/**
 * One shared app password instead of Supabase Auth: no emails, no links, works on any
 * device. The cookie holds an HMAC of the password, so changing APP_PASSWORD in Vercel
 * signs every device out. Web Crypto, so it runs in the proxy and in route handlers.
 */
export const SESSION_COOKIE = "ar_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function appPassword(): string | undefined {
  return process.env.APP_PASSWORD || undefined;
}

export async function sessionToken(password: string): Promise<string> {
  return hmac(password, "amir-remixes-session-v1");
}

/** Constant-time string compare */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidSession(cookie: string | undefined, password = appPassword()): Promise<boolean> {
  if (!cookie || !password) return false;
  return safeEqual(cookie, await sessionToken(password));
}

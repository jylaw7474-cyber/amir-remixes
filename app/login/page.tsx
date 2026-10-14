"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const field = "rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent";

/**
 * Password first: Supabase's built-in mailer sends only a few emails an hour, and a
 * magic link only works in the browser that asked for it. The link stays as a fallback.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  function fail(error: string) {
    setState("error");
    setMessage(
      error === "Invalid login credentials"
        ? "מייל או סיסמה לא נכונים"
        : error.includes("rate limit")
          ? "נשלחו יותר מדי מיילים בשעה האחרונה. תיכנס עם סיסמה, או תנסה שוב בעוד שעה"
          : error,
    );
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) return fail(error.message);
    router.replace("/");
    router.refresh();
  }

  async function sendLink() {
    if (!email) return fail("תכתוב קודם את המייל");
    setState("busy");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return fail(error.message);
    setState("sent");
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-2xl border border-line bg-surface p-6">
      <h1 className="mb-6 text-2xl font-bold">כניסה</h1>
      {state === "sent" ? (
        <p className="text-ok">נשלח! תפתח את המייל באותו דפדפן ותלחץ על הקישור.</p>
      ) : (
        <form onSubmit={signIn} className="flex flex-col gap-3">
          <input
            type="email"
            required
            dir="ltr"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <input
            type="password"
            required
            dir="ltr"
            autoComplete="current-password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <button
            disabled={state === "busy"}
            className="rounded-lg bg-accent px-4 py-2 font-bold text-on-accent disabled:opacity-50"
          >
            {state === "busy" ? "רגע..." : "כניסה"}
          </button>
          <button
            type="button"
            disabled={state === "busy"}
            onClick={sendLink}
            className="text-sm text-muted hover:text-accent disabled:opacity-50"
          >
            אין לי סיסמה, שלחו לי קישור למייל
          </button>
          {state === "error" && <p className="text-sm text-danger">{message}</p>}
        </form>
      )}
    </div>
  );
}

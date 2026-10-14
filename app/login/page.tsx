"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-2xl border border-line bg-surface p-6">
      <h1 className="mb-1 text-2xl font-bold">כניסה</h1>
      <p className="mb-6 text-sm text-muted">נשלח לך קישור כניסה למייל. בלי סיסמה.</p>
      {state === "sent" ? (
        <p className="text-ok">נשלח! תפתח את המייל ותלחץ על הקישור.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            dir="ltr"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent"
          />
          <button
            disabled={state === "sending"}
            className="rounded-lg bg-accent px-4 py-2 font-bold text-on-accent disabled:opacity-50"
          >
            {state === "sending" ? "שולח..." : "שלח לי קישור"}
          </button>
          {state === "error" && <p className="text-sm text-danger">{message}</p>}
        </form>
      )}
    </div>
  );
}

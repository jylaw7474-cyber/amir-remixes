"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const field = "rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent";

/** Set or change the password, so later sign-ins skip the email link */
export default function AccountPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return fail("לפחות 8 תווים");
    if (password !== confirm) return fail("הסיסמאות לא זהות");
    setState("busy");
    const { error } = await createClient().auth.updateUser({ password });
    if (error) return fail(error.message);
    setState("done");
    setPassword("");
    setConfirm("");
  }

  function fail(text: string) {
    setState("error");
    setMessage(text);
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-line bg-surface p-6">
      <h1 className="mb-1 text-2xl font-bold">סיסמה</h1>
      <p className="mb-6 text-sm text-muted">עם סיסמה אפשר להיכנס מכל מכשיר, בלי לחכות למייל.</p>
      <form onSubmit={save} className="flex flex-col gap-3">
        <input
          type="password"
          dir="ltr"
          autoComplete="new-password"
          placeholder="סיסמה חדשה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
        />
        <input
          type="password"
          dir="ltr"
          autoComplete="new-password"
          placeholder="שוב את אותה סיסמה"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={field}
        />
        <button
          disabled={state === "busy"}
          className="rounded-lg bg-accent px-4 py-2 font-bold text-on-accent disabled:opacity-50"
        >
          {state === "busy" ? "שומר..." : "שמירה"}
        </button>
        {state === "done" && <p className="text-sm text-ok">נשמר. מעכשיו אפשר להיכנס עם המייל והסיסמה.</p>}
        {state === "error" && <p className="text-sm text-danger">{message}</p>}
      </form>
    </div>
  );
}

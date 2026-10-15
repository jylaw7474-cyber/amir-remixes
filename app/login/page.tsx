"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/login", { body: { password } });
      // full load, so the proxy and the header both see the new cookie
      window.location.assign("/");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-2xl border border-line bg-surface p-6">
      <h1 className="mb-6 text-2xl font-bold">כניסה</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          required
          dir="ltr"
          autoComplete="current-password"
          autoCapitalize="none"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-base outline-none focus:border-accent"
        />
        <button disabled={busy} className="rounded-lg bg-accent px-4 py-2 font-bold text-on-accent disabled:opacity-50">
          {busy ? "רגע..." : "כניסה"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </div>
  );
}

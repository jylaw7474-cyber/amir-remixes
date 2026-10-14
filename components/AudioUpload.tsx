"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;
const EXTENSIONS = ["mp3", "m4a"];

export interface UploadedAudio {
  path: string;
  name: string;
}

/**
 * Puts an mp3/m4a straight into the owner's folder of our private bucket through a
 * signed upload slot (so big files skip our server), plus the rights confirmation Mureka's terms require.
 */
export default function AudioUpload({
  label,
  hint,
  value,
  onChange,
  rightsConfirmed,
  onRightsChange,
}: {
  label: string;
  hint: string;
  value: UploadedAudio | null;
  onChange: (value: UploadedAudio | null) => void;
  rightsConfirmed: boolean;
  onRightsChange: (value: boolean) => void;
}) {
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!EXTENSIONS.includes(ext)) return fail("רק קבצי MP3 או M4A");
    if (file.size > MAX_BYTES) return fail("הקובץ גדול מ-10MB");

    setState("uploading");
    let slot: { path: string; token: string };
    try {
      slot = await api<{ path: string; token: string }>("/api/upload-url", { body: { ext } });
    } catch (e) {
      return fail((e as Error).message);
    }

    const { error: uploadError } = await createClient()
      .storage.from("tracks")
      .uploadToSignedUrl(slot.path, slot.token, file, { contentType: ext === "mp3" ? "audio/mpeg" : "audio/mp4" });
    if (uploadError) return fail(uploadError.message);
    const path = slot.path;

    setState("idle");
    onChange({ path, name: file.name });
  }

  function fail(message: string) {
    setState("error");
    setError(message);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted">{hint}</p>
      {value ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="truncate text-accent-2" dir="ltr">{value.name}</span>
          <button className="text-xs text-muted hover:text-danger" onClick={() => onChange(null)}>הסרה</button>
        </div>
      ) : (
        <label className="cursor-pointer self-start rounded-lg border border-accent px-3 py-1.5 text-sm text-accent">
          {state === "uploading" ? "מעלה..." : "בחירת קובץ"}
          <input
            type="file"
            accept=".mp3,.m4a,audio/mpeg,audio/mp4"
            className="hidden"
            disabled={state === "uploading"}
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
      )}
      {state === "error" && <p className="text-xs text-danger">{error}</p>}
      {value && (
        <label className="flex items-start gap-2 text-xs text-muted">
          <input
            type="checkbox"
            className="mt-0.5 accent-[var(--accent)]"
            checked={rightsConfirmed}
            onChange={(e) => onRightsChange(e.target.checked)}
          />
          השיר שלי, או שיש לי רשות להשתמש בו
        </label>
      )}
    </div>
  );
}

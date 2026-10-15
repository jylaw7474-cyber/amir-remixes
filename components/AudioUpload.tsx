"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { prepareAudio } from "@/lib/audio-prepare";
import { createClient } from "@/lib/supabase/client";

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
  maxSeconds,
  value,
  onChange,
  rightsConfirmed,
  onRightsChange,
}: {
  label: string;
  hint: string;
  /** Mureka keeps at most this much (30 s for a reference, 350 s for a remix) */
  maxSeconds: number;
  value: UploadedAudio | null;
  onChange: (value: UploadedAudio | null) => void;
  rightsConfirmed: boolean;
  onRightsChange: (value: boolean) => void;
}) {
  const [state, setState] = useState<"idle" | "converting" | "uploading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setState("converting");
    setProgress(0);
    let prepared;
    let slot: { path: string; token: string };
    try {
      prepared = await prepareAudio(file, maxSeconds, setProgress);
      setState("uploading");
      slot = await api<{ path: string; token: string }>("/api/upload-url", { body: { ext: prepared.ext } });
    } catch (e) {
      return fail((e as Error).message);
    }

    const { error: uploadError } = await createClient()
      .storage.from("tracks")
      .uploadToSignedUrl(slot.path, slot.token, prepared.blob, {
        contentType: prepared.ext === "mp3" ? "audio/mpeg" : "audio/mp4",
      });
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
          <span className="min-w-0 truncate text-accent-2" dir="ltr">{value.name}</span>
          <button className="text-xs text-muted hover:text-danger" onClick={() => onChange(null)}>הסרה</button>
        </div>
      ) : (
        <label className="cursor-pointer self-start rounded-lg border border-accent px-3 py-1.5 text-sm text-accent">
          {state === "converting"
            ? `מכווץ... ${Math.round(progress * 100)}%`
            : state === "uploading"
              ? "מעלה..."
              : "בחירת קובץ"}
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.flac,.aac,.ogg"
            className="hidden"
            disabled={state === "converting" || state === "uploading"}
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

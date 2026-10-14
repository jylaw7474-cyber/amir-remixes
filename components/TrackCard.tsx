"use client";

import { MODE_LABELS, type TrackView } from "@/lib/tracks";
import { isFinal } from "./useTracks";

const STATUS_LABELS: Record<string, string> = {
  succeeded: "מוכן",
  failed: "נכשל",
  cancelled: "בוטל",
  timeouted: "נגמר הזמן",
};

export default function TrackCard({
  track,
  onDelete,
  onExtend,
  onStems,
}: {
  track: TrackView;
  onDelete?: (id: string) => void;
  onExtend?: (track: TrackView, choice: number) => void;
  onStems?: (url: string) => void;
}) {
  const done = isFinal(track);
  const title = track.title || track.prompt || track.lyrics?.split("\n")[0] || "ללא שם";

  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{title}</h3>
          <p className="text-xs text-muted">
            {MODE_LABELS[track.mode]} · {new Date(track.created_at).toLocaleString("he-IL")}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            track.status === "succeeded"
              ? "bg-ok/15 text-ok"
              : done
                ? "bg-danger/15 text-danger"
                : "animate-pulse bg-accent-2/20 text-accent-2"
          }`}
        >
          {STATUS_LABELS[track.status] ?? "יוצר..."}
        </span>
      </div>

      {track.failed_reason && <p className="mb-2 text-sm text-danger">{track.failed_reason}</p>}

      {track.playUrls.map((url, i) => (
        <div key={url} className="mt-3">
          {track.playUrls.length > 1 && <p className="mb-1 text-xs text-muted">גרסה {i + 1}</p>}
          <audio controls preload="none" src={url} />
          <div className="mt-1 flex flex-wrap gap-3 text-xs">
            <a href={url} download className="text-accent hover:underline">הורדה</a>
            {onExtend && track.choice_ids[i] && (
              <button className="text-accent hover:underline" onClick={() => onExtend(track, i)}>הארכה</button>
            )}
            {onStems && (
              <button className="text-accent hover:underline" onClick={() => onStems(track.source_urls[i] ?? url)}>
                הפרדת ערוצים
              </button>
            )}
          </div>
        </div>
      ))}

      {onDelete && done && (
        <button
          className="mt-3 text-xs text-muted hover:text-danger"
          onClick={() => confirm("למחוק את השיר?") && onDelete(track.id)}
        >
          מחיקה
        </button>
      )}
    </article>
  );
}

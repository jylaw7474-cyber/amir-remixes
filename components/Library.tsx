"use client";

import TrackCard from "./TrackCard";
import { useTracks } from "./useTracks";

export default function Library() {
  const { tracks, loaded, error, remove } = useTracks();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">הספרייה שלי</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      {loaded && !error && tracks.length === 0 && <p className="text-muted">הספרייה ריקה.</p>}
      <div className="grid gap-3">
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} onDelete={remove} />
        ))}
      </div>
    </div>
  );
}

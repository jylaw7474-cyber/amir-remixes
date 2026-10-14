"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { TrackView } from "@/lib/tracks";

const FINAL = ["succeeded", "failed", "cancelled", "timeouted"];
const POLL_MS = 4000;

export const isFinal = (t: TrackView) => FINAL.includes(t.status);

/** The user's tracks, polling the ones still being generated until they finish */
export function useTracks() {
  const [tracks, setTracks] = useState<TrackView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tracksRef = useRef(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const upsert = useCallback((t: TrackView) => {
    setTracks((prev) => (prev.some((p) => p.id === t.id) ? prev.map((p) => (p.id === t.id ? t : p)) : [t, ...prev]));
  }, []);

  const remove = useCallback(async (id: string) => {
    await api(`/api/tracks/${id}`, { method: "DELETE" });
    setTracks((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    api<TrackView[]>("/api/tracks")
      .then(setTracks)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      tracksRef.current
        .filter((t) => !isFinal(t))
        .forEach((t) => api<TrackView>(`/api/tracks/${t.id}`).then(upsert).catch(() => {}));
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [upsert]);

  return { tracks, loaded, error, upsert, remove };
}

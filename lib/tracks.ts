export type Mode = "easy" | "song" | "instrumental" | "extend";

export interface Track {
  id: string;
  mode: Mode;
  task_kind: "song" | "instrumental";
  task_id: string;
  title: string | null;
  prompt: string | null;
  lyrics: string | null;
  status: string;
  failed_reason: string | null;
  source_urls: string[];
  choice_ids: string[];
  storage_paths: string[];
  created_at: string;
}

/** What the browser gets: a track plus playable URLs */
export interface TrackView extends Track {
  playUrls: string[];
}

export const MODE_LABELS: Record<Mode, string> = {
  easy: "שיר מתיאור",
  song: "שיר מהמילים שלי",
  instrumental: "אינסטרומנטלי",
  extend: "הארכת שיר",
};

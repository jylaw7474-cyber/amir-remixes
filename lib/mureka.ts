import "server-only";

/**
 * Client for the official Mureka API (https://platform.mureka.ai/docs).
 * Field names were checked against the live API in rork-hit-studio:
 * song/extend takes song_id, song/stem takes url, song/easy-generate takes prompt,
 * lyrics/extend takes lyrics.
 */

const API_URL = "https://api.mureka.ai";

export type TaskKind = "song" | "instrumental";

export type TaskStatus =
  | "preparing"
  | "queued"
  | "pending"
  | "running"
  | "processing"
  | "streaming"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timeouted";

export const FINAL_STATUSES: TaskStatus[] = ["succeeded", "failed", "cancelled", "timeouted"];

export interface TaskResult {
  status: TaskStatus;
  audioUrls: string[];
  /** Mureka song ids of each choice, needed to extend a song */
  choiceIds: string[];
  failedReason?: string;
}

export interface LyricsResult {
  title?: string;
  lyrics: string;
}

function apiKey(): string {
  const key = process.env.MUREKA_API_KEY;
  if (!key) throw new Error("MUREKA_API_KEY is not set");
  return key;
}

async function request<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mureka ${path} failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

async function startTask(path: string, body: Record<string, unknown>): Promise<string> {
  const result = await request<{ id?: string }>("POST", path, body);
  if (!result.id) throw new Error(`Mureka ${path} returned no task id`);
  return result.id;
}

/** Prompt-only song: Mureka writes the lyrics itself */
export function startEasySong(prompt: string): Promise<string> {
  return startTask("/v1/song/easy-generate", { prompt, model: "auto" });
}

/**
 * Song from the user's own lyrics, styled either by a text prompt or by an uploaded
 * reference clip. Mureka takes one or the other, so a reference drops the prompt.
 */
export function startSong(lyrics: string, prompt = "", referenceId?: string): Promise<string> {
  return startTask(
    "/v1/song/generate",
    referenceId ? { lyrics, reference_id: referenceId, model: "auto" } : { lyrics, prompt, model: "auto" },
  );
}

/** Instrumental track, no vocals */
export function startInstrumental(prompt: string): Promise<string> {
  return startTask("/v1/instrumental/generate", { prompt, model: "auto" });
}

/** Continue an existing song; polled like a song task */
export function startExtend(songId: string, lyrics = ""): Promise<string> {
  return startTask("/v1/song/extend", { song_id: songId, lyrics });
}

export type UploadPurpose = "reference" | "remix";

/**
 * Hand Mureka a file by URL (files/upload accepts url instead of file), so large audio
 * never passes through our own server. reference: mp3/m4a, trimmed to 30 s.
 * remix: mp3/m4a, 10 to 350 s. Both: 10 MB max.
 */
export async function uploadFileFromUrl(url: string, purpose: UploadPurpose): Promise<string> {
  const form = new FormData();
  form.set("url", url);
  form.set("purpose", purpose);
  const response = await fetch(`${API_URL}/v1/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mureka /v1/files/upload failed (${response.status}): ${text.slice(0, 300)}`);
  }
  const file = (await response.json()) as { id?: string };
  if (!file.id) throw new Error("Mureka /v1/files/upload returned no file id");
  return file.id;
}

/**
 * Remix an uploaded track or a song already made here; polled like a song task.
 * Field names follow song/extend (song_id or upload_audio_id); Mureka's docs page for
 * song/remix does not list its body, so check against the live API's errors.
 */
export function startRemix(source: { uploadId: string } | { songId: string }, prompt: string): Promise<string> {
  return startTask("/v1/song/remix", {
    ...("uploadId" in source ? { upload_audio_id: source.uploadId } : { song_id: source.songId }),
    prompt,
  });
}

interface RawTask {
  status: TaskStatus;
  failed_reason?: string;
  choices?: { id?: string; url?: string; flac_url?: string }[];
}

export async function queryTask(kind: TaskKind, taskId: string): Promise<TaskResult> {
  const raw = await request<RawTask>("GET", `/v1/${kind}/query/${encodeURIComponent(taskId)}`);
  const choices = raw.status === "succeeded" ? raw.choices ?? [] : [];
  return {
    status: raw.status,
    audioUrls: choices.map((c) => c.url).filter((u): u is string => !!u),
    choiceIds: choices.map((c) => c.id).filter((id): id is string => !!id),
    failedReason: raw.failed_reason,
  };
}

export function generateLyrics(prompt: string): Promise<LyricsResult> {
  return request<LyricsResult>("POST", "/v1/lyrics/generate", { prompt });
}

export function extendLyrics(lyrics: string): Promise<LyricsResult> {
  return request<LyricsResult>("POST", "/v1/lyrics/extend", { lyrics });
}

/** Split a song into stems; the response shape is undocumented, so callers use collectUrls */
export function stemSong(url: string): Promise<unknown> {
  return request<unknown>("POST", "/v1/song/stem", { url });
}

export function queryBilling(): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>("GET", "/v1/account/billing");
}

/** Every http(s) URL anywhere in a value, for responses whose shape is not documented */
export function collectUrls(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value)) found.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectUrls(v, found));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectUrls(v, found));
  }
  return found;
}

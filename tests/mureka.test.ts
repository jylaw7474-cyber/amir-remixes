import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectUrls,
  queryTask,
  startEasySong,
  startExtend,
  startInstrumental,
  startSong,
  stemSong,
} from "@/lib/mureka";

const fetchMock = vi.fn();

function reply(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit, body: init.body ? JSON.parse(init.body as string) : undefined };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MUREKA_API_KEY", "test-key");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("starting tasks", () => {
  it("easy song posts the prompt with the bearer key", async () => {
    reply({ id: "t1" });
    await expect(startEasySong("happy pop")).resolves.toBe("t1");
    const { url, init, body } = lastCall();
    expect(url).toBe("https://api.mureka.ai/v1/song/easy-generate");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(body).toEqual({ prompt: "happy pop", model: "auto" });
  });

  it("song posts lyrics and style", async () => {
    reply({ id: "t2" });
    await startSong("la la", "rock");
    expect(lastCall().body).toEqual({ lyrics: "la la", prompt: "rock", model: "auto" });
  });

  it("instrumental and extend hit their own endpoints", async () => {
    reply({ id: "t3" });
    await startInstrumental("house");
    expect(lastCall().url).toBe("https://api.mureka.ai/v1/instrumental/generate");

    reply({ id: "t4" });
    await startExtend("song-9", "more");
    expect(lastCall().url).toBe("https://api.mureka.ai/v1/song/extend");
    expect(lastCall().body).toEqual({ song_id: "song-9", lyrics: "more" });
  });

  it("throws with Mureka's message on an error status", async () => {
    reply("insufficient balance", 402);
    await expect(startEasySong("x")).rejects.toThrow(/402.*insufficient balance/);
  });

  it("throws when no task id comes back", async () => {
    reply({});
    await expect(startEasySong("x")).rejects.toThrow(/no task id/);
  });

  it("refuses to call without an API key", async () => {
    vi.stubEnv("MUREKA_API_KEY", "");
    await expect(startEasySong("x")).rejects.toThrow(/MUREKA_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("queryTask", () => {
  it("returns audio urls and choice ids once succeeded", async () => {
    reply({ status: "succeeded", choices: [{ id: "c1", url: "https://a/1.mp3" }, { id: "c2", url: "https://a/2.mp3" }] });
    const result = await queryTask("song", "t1");
    expect(lastCall().url).toBe("https://api.mureka.ai/v1/song/query/t1");
    expect(result).toEqual({
      status: "succeeded",
      audioUrls: ["https://a/1.mp3", "https://a/2.mp3"],
      choiceIds: ["c1", "c2"],
      failedReason: undefined,
    });
  });

  it("returns no audio while still running, and the reason on failure", async () => {
    reply({ status: "running", choices: [{ url: "https://partial" }] });
    expect((await queryTask("instrumental", "t2")).audioUrls).toEqual([]);

    reply({ status: "failed", failed_reason: "bad lyrics" });
    expect((await queryTask("song", "t3")).failedReason).toBe("bad lyrics");
  });
});

describe("stems", () => {
  it("collects every url from an undocumented response shape", async () => {
    reply({ zip_url: "https://s/all.zip", stems: [{ vocals: "https://s/v.mp3" }, { note: "not a url" }] });
    const result = await stemSong("https://song.mp3");
    expect(lastCall().body).toEqual({ url: "https://song.mp3" });
    expect(collectUrls(result)).toEqual(["https://s/all.zip", "https://s/v.mp3"]);
  });
});

describe("uploads, reference and remix", () => {
  it("uploads by url as multipart with the purpose", async () => {
    reply({ id: "file-1" });
    const { uploadFileFromUrl } = await import("@/lib/mureka");
    await expect(uploadFileFromUrl("https://bucket/signed.mp3", "remix")).resolves.toBe("file-1");
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe("https://api.mureka.ai/v1/files/upload");
    const form = (init as RequestInit).body as FormData;
    expect(form.get("url")).toBe("https://bucket/signed.mp3");
    expect(form.get("purpose")).toBe("remix");
  });

  it("a reference replaces the style prompt in song generation", async () => {
    reply({ id: "t5" });
    await startSong("la la", "rock", "ref-1");
    expect(lastCall().body).toEqual({ lyrics: "la la", reference_id: "ref-1", model: "auto" });
  });

  it("remixes an uploaded file or an existing song", async () => {
    const { startRemix } = await import("@/lib/mureka");
    reply({ id: "t6" });
    await startRemix({ uploadId: "file-1" }, "house version");
    expect(lastCall().url).toBe("https://api.mureka.ai/v1/song/remix");
    expect(lastCall().body).toEqual({ upload_audio_id: "file-1", prompt: "house version" });

    reply({ id: "t7" });
    await startRemix({ songId: "song-2" }, "acoustic");
    expect(lastCall().body).toEqual({ song_id: "song-2", prompt: "acoustic" });
  });
});

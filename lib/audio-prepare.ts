/**
 * Mureka takes mp3/m4a up to 10 MB. Bigger files, or other formats the browser can
 * decode (wav, flac, aac, ogg...), are decoded, trimmed to what Mureka would keep
 * anyway, and re-encoded as a 128 kbps mp3 in the browser, so a 6-minute track lands
 * near 5.6 MB.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const SAMPLE_RATE = 44100;
const KBPS = 128;
const BLOCK = 1152 * 20;

export interface PreparedAudio {
  blob: Blob;
  ext: "mp3" | "m4a";
  converted: boolean;
}

export function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function needsConversion(name: string, size: number): boolean {
  const ext = extensionOf(name);
  return !(ext === "mp3" || ext === "m4a") || size > MAX_UPLOAD_BYTES;
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export async function prepareAudio(
  file: File,
  maxSeconds: number,
  onProgress: (fraction: number) => void,
): Promise<PreparedAudio> {
  const ext = extensionOf(file.name);
  if (!needsConversion(file.name, file.size)) {
    return { blob: file, ext: ext as "mp3" | "m4a", converted: false };
  }

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("הדפדפן לא מצליח לקרוא את הקובץ. נסה MP3 או WAV");
  } finally {
    void ctx.close();
  }

  // Trim and resample in one pass
  const seconds = Math.min(decoded.duration, maxSeconds);
  const channels = decoded.numberOfChannels > 1 ? 2 : 1;
  const offline = new OfflineAudioContext(channels, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0, 0, seconds);
  const rendered = await offline.startRendering();

  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const encoder = new Mp3Encoder(channels, SAMPLE_RATE, KBPS);
  const left = toInt16(rendered.getChannelData(0));
  const right = channels === 2 ? toInt16(rendered.getChannelData(1)) : undefined;
  const parts: Uint8Array[] = [];

  for (let i = 0; i < left.length; i += BLOCK) {
    const chunk = right
      ? encoder.encodeBuffer(left.subarray(i, i + BLOCK), right.subarray(i, i + BLOCK))
      : encoder.encodeBuffer(left.subarray(i, i + BLOCK));
    if (chunk.length) parts.push(chunk);
    if ((i / BLOCK) % 25 === 0) {
      onProgress(i / left.length);
      await new Promise((r) => setTimeout(r, 0)); // keep the page responsive
    }
  }
  const tail = encoder.flush();
  if (tail.length) parts.push(tail);
  onProgress(1);

  const blob = new Blob(parts as BlobPart[], { type: "audio/mpeg" });
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("גם אחרי כיווץ הקובץ גדול מ-10MB");
  return { blob, ext: "mp3", converted: true };
}

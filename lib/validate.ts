export const LIMITS = { prompt: 1000, lyrics: 3000, title: 120 };

export function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

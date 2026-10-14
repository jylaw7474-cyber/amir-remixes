import { describe, expect, it } from "vitest";
import { isValidSession, safeEqual, sessionToken } from "@/lib/session";

describe("app session", () => {
  it("accepts the token made from the current password", async () => {
    expect(await isValidSession(await sessionToken("12345678"), "12345678")).toBe(true);
  });

  it("rejects a token after the password changes, a missing cookie, or no password set", async () => {
    const old = await sessionToken("old-password");
    expect(await isValidSession(old, "new-password")).toBe(false);
    expect(await isValidSession(undefined, "new-password")).toBe(false);
    expect(await isValidSession(old, undefined)).toBe(false);
  });

  it("compares strings exactly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});

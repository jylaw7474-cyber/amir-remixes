import { describe, expect, it } from "vitest";
import { isOwnUploadPath } from "@/lib/uploads";

describe("isOwnUploadPath", () => {
  const me = "11111111-1111-1111-1111-111111111111";

  it("accepts files in the user's own uploads folder", () => {
    expect(isOwnUploadPath(me, `${me}/uploads/abc.mp3`)).toBe(true);
  });

  it("rejects other users' folders, generated tracks and path tricks", () => {
    expect(isOwnUploadPath(me, "22222222-2222-2222-2222-222222222222/uploads/abc.mp3")).toBe(false);
    expect(isOwnUploadPath(me, `${me}/track-1/1.mp3`)).toBe(false);
    expect(isOwnUploadPath(me, `${me}/uploads/../../other/x.mp3`)).toBe(false);
  });
});

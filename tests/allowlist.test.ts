import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/lib/allowlist";

describe("isAllowedEmail", () => {
  it("matches case-insensitively and ignores spaces", () => {
    expect(isAllowedEmail("Amir@JYLaw.co.il", " amir@jylaw.co.il , other@x.com")).toBe(true);
  });

  it("rejects emails not on the list", () => {
    expect(isAllowedEmail("stranger@x.com", "amir@jylaw.co.il")).toBe(false);
  });

  it("lets nobody in when the list is empty or the email is missing", () => {
    expect(isAllowedEmail("amir@jylaw.co.il", "")).toBe(false);
    expect(isAllowedEmail(undefined, "amir@jylaw.co.il")).toBe(false);
  });
});

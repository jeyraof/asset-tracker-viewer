import { describe, expect, it } from "vitest";
import { timingSafeEqualString } from "../src/lib/secure";

describe("timingSafeEqualString", () => {
  it("matches identical strings", () => {
    expect(timingSafeEqualString("secret-token", "secret-token")).toBe(true);
  });

  it("rejects different strings of equal length", () => {
    expect(timingSafeEqualString("secret-token", "secret-tokeX")).toBe(false);
  });

  it("rejects different lengths", () => {
    expect(timingSafeEqualString("short", "much-longer-value")).toBe(false);
  });
});

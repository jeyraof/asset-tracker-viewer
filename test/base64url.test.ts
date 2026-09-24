import { describe, expect, it } from "vitest";
import { base64urlDecode, base64urlEncode, utf8Encode } from "../src/lib/base64url";

describe("base64url", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 250, 255, 128, 64]);
    expect(Array.from(base64urlDecode(base64urlEncode(bytes)))).toEqual(Array.from(bytes));
  });

  it("encodes without padding or url-unsafe characters", () => {
    const encoded = base64urlEncode(new Uint8Array([251, 239, 190]));
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("round-trips utf-8 text", () => {
    const text = "자산 추적기";
    expect(new TextDecoder().decode(base64urlDecode(base64urlEncode(utf8Encode(text))))).toBe(text);
  });
});

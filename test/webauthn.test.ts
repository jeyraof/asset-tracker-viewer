import { describe, expect, it } from "vitest";
import { resolveRpId, rpConfig } from "../src/auth/webauthn";
import type { Env } from "../src/env";

describe("resolveRpId", () => {
  const configured = ["asset.example.com", "example.com"];

  it("matches an exact host", () => {
    expect(resolveRpId(["asset.example.com"], "asset.example.com")).toBe("asset.example.com");
  });

  it("matches a subdomain to its parent domain", () => {
    expect(resolveRpId(["example.com"], "asset.example.com")).toBe("example.com");
  });

  it("prefers the longest configured match", () => {
    expect(resolveRpId(configured, "asset.example.com")).toBe("asset.example.com");
  });

  it("returns null for an unconfigured host", () => {
    expect(resolveRpId(["asset.example.com"], "evil.example.com")).toBeNull();
  });

  it("requires a domain-boundary suffix", () => {
    expect(resolveRpId(["example.com"], "notexample.com")).toBeNull();
  });
});

describe("rpConfig", () => {
  it("parses trimmed comma-separated lists", () => {
    const env = {
      RP_IDS: "a.example.com, b.example.com",
      ORIGINS: "https://a.example.com , https://b.example.com",
    } as Env;
    expect(rpConfig(env)).toEqual({
      rpIDs: ["a.example.com", "b.example.com"],
      origins: ["https://a.example.com", "https://b.example.com"],
    });
  });

  it("throws when RP_IDS or ORIGINS is empty", () => {
    expect(() => rpConfig({ RP_IDS: "", ORIGINS: "" } as Env)).toThrow();
    expect(() => rpConfig({ RP_IDS: "a.example.com", ORIGINS: "" } as Env)).toThrow();
  });
});

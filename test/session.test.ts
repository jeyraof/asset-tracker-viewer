import { describe, expect, it } from "vitest";
import { clearedCookie, readCookie, signSession, verifySession } from "../src/auth/session";
import type { Env } from "../src/env";

const env = { SESSION_SECRET: "test-secret-value" } as Env;

describe("session", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession(env, "owner");
    const payload = await verifySession(env, token);
    expect(payload?.uid).toBe("owner");
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered payload", async () => {
    const token = await signSession(env, "owner");
    const [body, signature] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ uid: "attacker", iat: 0, exp: 9999999999 })).toString("base64url")}.${signature}`;
    expect(await verifySession(env, forged)).toBeNull();
    expect(body).toBeDefined();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSession({ SESSION_SECRET: "other" } as Env, "owner");
    expect(await verifySession(env, token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signSession(env, "owner", -10);
    expect(await verifySession(env, token)).toBeNull();
  });

  it("rejects missing/empty tokens", async () => {
    expect(await verifySession(env, undefined)).toBeNull();
    expect(await verifySession(env, "not-a-token")).toBeNull();
  });
});

describe("cookies", () => {
  it("reads a named cookie", () => {
    const request = new Request("https://example.com/", {
      headers: { cookie: "a=1; __Host-session=abc.def; b=2" },
    });
    expect(readCookie(request, "__Host-session")).toBe("abc.def");
    expect(readCookie(request, "missing")).toBeUndefined();
  });

  it("clears with an expiring cookie", () => {
    expect(clearedCookie("__Host-session")).toContain("Max-Age=0");
  });
});

import { describe, expect, it } from "vitest";
import handler from "../src/index";
import type { Env } from "../src/env";

const env = {
  DB: {} as D1Database,
  AUTH_DB: {} as D1Database,
  RP_NAME: "Asset Tracker",
  RP_IDS: "viewer.example.com",
  ORIGINS: "https://viewer.example.com",
  SESSION_SECRET: "test-secret",
  SETUP_TOKEN: "test-setup",
} satisfies Env;

async function fetch(path: string, init?: RequestInit): Promise<Response> {
  return handler.fetch(new Request(`https://viewer.example.com${path}`, init), env);
}

describe("router", () => {
  it("serves the stylesheet with a strict CSP", async () => {
    const response = await fetch("/style.css");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("serves the client script", async () => {
    const response = await fetch("/client.js");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/javascript");
  });

  it("redirects unauthenticated visitors to /login", async () => {
    const response = await fetch("/");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("rejects a forged session cookie", async () => {
    const response = await fetch("/", { headers: { cookie: "__Host-session=forged.value" } });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
  });

  it("renders the login page", async () => {
    const response = await fetch("/login");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("passkey로 로그인");
  });

  it("clears the session cookie on logout", async () => {
    const response = await fetch("/auth/logout", { method: "POST" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/login");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("returns a 404 page for unknown routes", async () => {
    const response = await fetch("/does-not-exist");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("404");
  });

  it("blocks cross-origin POSTs", async () => {
    const response = await fetch("/auth/login/options", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    expect(response.status).toBe(403);
  });
});

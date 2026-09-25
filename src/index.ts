import type {
  AuthenticationResponseJSON,
  AuthenticatorTransport,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { CLIENT_JS, STYLES } from "./assets";
import { CHALLENGE_COOKIE, clearedCookie, readCookie, SESSION_COOKIE, sessionCookie, signSession, verifySession, type SessionPayload } from "./auth/session";
import {
  countCredentialsForRp,
  getCredential,
  insertCredential,
  listCredentialsForRp,
  putChallenge,
  takeChallenge,
  updateCredentialAfterUse,
} from "./auth/store";
import { authenticationOptions, OWNER_UID, registrationOptions, resolveRpId, rpConfig, verifyAuthentication, verifyRegistration } from "./auth/webauthn";
import {
  getAccount,
  getAccountSummary,
  getLatestFxRate,
  listAccountSummaries,
  listFxRates,
  listLatestHoldings,
  listRecentTrades,
  listSnapshotHistory,
} from "./db/portfolio";
import { listFxFetches, listSyncErrors, listSyncRuns } from "./db/status";
import type { Env } from "./env";
import { base64urlEncode } from "./lib/base64url";
import type { SafeHtml } from "./lib/html";
import { timingSafeEqualString } from "./lib/secure";
import { loginPage, registerPage } from "./views/auth";
import { notFoundPage } from "./views/error";
import { accountPage, accountsPage, fxPage } from "./views/portfolio";
import { statusPage } from "./views/status";

const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
};

const CHALLENGE_TTL_SECONDS = 300;

function withSecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function htmlResponse(page: SafeHtml, status = 200): Response {
  return withSecurityHeaders(
    new Response(page.value, {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
  );
}

function textResponse(body: string, contentType: string): Response {
  return withSecurityHeaders(
    new Response(body, { headers: { "content-type": contentType } }),
  );
}

function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json; charset=utf-8", ...headers },
    }),
  );
}

function redirect(location: string, status = 303): Response {
  return withSecurityHeaders(new Response(null, { status, headers: { location } }));
}

function challengeCookie(id: string): string {
  return `${CHALLENGE_COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${CHALLENGE_TTL_SECONDS}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
  return {};
}

async function currentSession(env: Env, request: Request): Promise<SessionPayload | null> {
  return verifySession(env, readCookie(request, SESSION_COOKIE));
}

/** Rejects cross-origin POSTs; requests without an Origin (e.g. curl) are allowed. */
function originAllowed(env: Env, request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return rpConfig(env).origins.includes(origin);
}

/** Resolves the WebAuthn RP ID for the request host, or null when the host is not configured. */
function requestRpId(env: Env, request: Request): string | null {
  return resolveRpId(rpConfig(env).rpIDs, new URL(request.url).hostname);
}

async function handleRegisterOptions(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(env, request)) return jsonResponse({ error: "forbidden" }, 403);
  const rpID = requestRpId(env, request);
  if (!rpID) return jsonResponse({ error: "unsupported host" }, 400);

  const body = await readJson(request);
  const setupToken = typeof body.setupToken === "string" ? body.setupToken : undefined;

  const count = await countCredentialsForRp(env.AUTH_DB, rpID);
  if (count === 0) {
    if (!env.SETUP_TOKEN) return jsonResponse({ error: "setup token not configured" }, 500);
    if (!setupToken || !timingSafeEqualString(setupToken, env.SETUP_TOKEN)) {
      return jsonResponse({ error: "invalid setup token" }, 401);
    }
  } else if (!(await currentSession(env, request))) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const options = await registrationOptions(env, rpID, await listCredentialsForRp(env.AUTH_DB, rpID));
  const challengeId = crypto.randomUUID();
  await putChallenge(env.AUTH_DB, challengeId, "registration", options.challenge, CHALLENGE_TTL_SECONDS);
  return jsonResponse(options, 200, { "set-cookie": challengeCookie(challengeId) });
}

async function handleRegisterVerify(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(env, request)) return jsonResponse({ error: "forbidden" }, 403);
  const rpID = requestRpId(env, request);
  if (!rpID) return jsonResponse({ error: "unsupported host" }, 400);

  const body = await readJson(request);
  const response = body.response as RegistrationResponseJSON | undefined;
  if (!response) return jsonResponse({ error: "missing response" }, 400);

  const count = await countCredentialsForRp(env.AUTH_DB, rpID);
  if (count > 0 && !(await currentSession(env, request))) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const challengeId = readCookie(request, CHALLENGE_COOKIE);
  const expectedChallenge = challengeId
    ? await takeChallenge(env.AUTH_DB, challengeId, "registration")
    : null;
  if (!expectedChallenge) return jsonResponse({ error: "challenge expired" }, 400);

  try {
    const verification = await verifyRegistration(env, response, expectedChallenge);
    if (!verification.verified) return jsonResponse({ error: "registration not verified" }, 400);

    const info = verification.registrationInfo;
    const label = typeof body.label === "string" && body.label.trim() !== "" ? body.label.trim() : null;
    const transports = (response.response.transports ?? info.credential.transports) as
      | AuthenticatorTransport[]
      | undefined;

    await insertCredential(env.AUTH_DB, {
      id: info.credential.id,
      publicKey: base64urlEncode(info.credential.publicKey),
      counter: info.credential.counter,
      transports,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      rpId: info.rpID ?? rpID,
      label,
    });

    const token = await signSession(env, OWNER_UID);
    const result = jsonResponse({ ok: true });
    result.headers.append("set-cookie", sessionCookie(token));
    result.headers.append("set-cookie", clearedCookie(CHALLENGE_COOKIE));
    return result;
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 400);
  }
}

async function handleLoginOptions(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(env, request)) return jsonResponse({ error: "forbidden" }, 403);
  const rpID = requestRpId(env, request);
  if (!rpID) return jsonResponse({ error: "unsupported host" }, 400);

  const credentials = await listCredentialsForRp(env.AUTH_DB, rpID);
  if (credentials.length === 0) return jsonResponse({ error: "no passkey registered" }, 409);

  const options = await authenticationOptions(env, rpID, credentials);
  const challengeId = crypto.randomUUID();
  await putChallenge(env.AUTH_DB, challengeId, "authentication", options.challenge, CHALLENGE_TTL_SECONDS);
  return jsonResponse(options, 200, { "set-cookie": challengeCookie(challengeId) });
}

async function handleLoginVerify(request: Request, env: Env): Promise<Response> {
  if (!originAllowed(env, request)) return jsonResponse({ error: "forbidden" }, 403);
  const rpID = requestRpId(env, request);
  if (!rpID) return jsonResponse({ error: "unsupported host" }, 400);

  const body = await readJson(request);
  const response = body.response as AuthenticationResponseJSON | undefined;
  if (!response || typeof response.id !== "string") {
    return jsonResponse({ error: "missing response" }, 400);
  }

  const credential = await getCredential(env.AUTH_DB, response.id);
  if (!credential || credential.rpId !== rpID) {
    return jsonResponse({ error: "unknown credential" }, 400);
  }

  const challengeId = readCookie(request, CHALLENGE_COOKIE);
  const expectedChallenge = challengeId
    ? await takeChallenge(env.AUTH_DB, challengeId, "authentication")
    : null;
  if (!expectedChallenge) return jsonResponse({ error: "challenge expired" }, 400);

  try {
    const verification = await verifyAuthentication(env, response, expectedChallenge, credential);
    if (!verification.verified) return jsonResponse({ error: "authentication failed" }, 401);

    const { newCounter } = verification.authenticationInfo;
    if (credential.counter !== 0 && newCounter !== 0 && newCounter <= credential.counter) {
      return jsonResponse({ error: "credential counter regression" }, 401);
    }
    await updateCredentialAfterUse(env.AUTH_DB, credential.id, newCounter);

    const token = await signSession(env, OWNER_UID);
    const result = jsonResponse({ ok: true });
    result.headers.append("set-cookie", sessionCookie(token));
    result.headers.append("set-cookie", clearedCookie(CHALLENGE_COOKIE));
    return result;
  } catch (error) {
    return jsonResponse({ error: errorMessage(error) }, 401);
  }
}

function handleLogout(): Response {
  const response = redirect("/login");
  response.headers.append("set-cookie", clearedCookie(SESSION_COOKIE));
  return response;
}

async function handleAccountDetail(env: Env, id: number): Promise<Response> {
  const account = await getAccount(env.DB, id);
  if (!account) return htmlResponse(notFoundPage(), 404);

  const [summary, holdings, history, trades, fx] = await Promise.all([
    getAccountSummary(env.DB, id),
    listLatestHoldings(env.DB, id),
    listSnapshotHistory(env.DB, id),
    listRecentTrades(env.DB, id),
    getLatestFxRate(env.DB, "USD", "KRW"),
  ]);

  return htmlResponse(accountPage({ account, summary, holdings, history, trades, fx }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    try {
      if (method === "GET" && pathname === "/style.css") {
        return textResponse(STYLES, "text/css; charset=utf-8");
      }
      if (method === "GET" && pathname === "/client.js") {
        return textResponse(CLIENT_JS, "text/javascript; charset=utf-8");
      }

      if (method === "GET" && pathname === "/login") {
        if (await currentSession(env, request)) return redirect("/");
        return htmlResponse(loginPage());
      }

      if (method === "GET" && pathname === "/register") {
        const rpID = requestRpId(env, request);
        if (!rpID) return jsonResponse({ error: "unsupported host" }, 400);
        const count = await countCredentialsForRp(env.AUTH_DB, rpID);
        if (count > 0 && !(await currentSession(env, request))) return redirect("/login");
        return htmlResponse(registerPage({ setupTokenRequired: count === 0 }));
      }

      if (method === "POST" && pathname === "/auth/register/options") {
        return handleRegisterOptions(request, env);
      }
      if (method === "POST" && pathname === "/auth/register/verify") {
        return handleRegisterVerify(request, env);
      }
      if (method === "POST" && pathname === "/auth/login/options") {
        return handleLoginOptions(request, env);
      }
      if (method === "POST" && pathname === "/auth/login/verify") {
        return handleLoginVerify(request, env);
      }
      if (method === "POST" && pathname === "/auth/logout") {
        return handleLogout();
      }

      if (method === "GET" && pathname === "/") {
        if (!(await currentSession(env, request))) return redirect("/login");
        const [summaries, fx] = await Promise.all([
          listAccountSummaries(env.DB),
          getLatestFxRate(env.DB, "USD", "KRW"),
        ]);
        return htmlResponse(accountsPage(summaries, fx));
      }

      if (method === "GET" && pathname === "/fx") {
        if (!(await currentSession(env, request))) return redirect("/login");
        const rates = await listFxRates(env.DB, "USD", "KRW");
        return htmlResponse(fxPage("USD", "KRW", rates));
      }

      if (method === "GET" && pathname === "/status") {
        if (!(await currentSession(env, request))) return redirect("/login");
        const [runs, errors, fxFetches, fx] = await Promise.all([
          listSyncRuns(env.DB),
          listSyncErrors(env.DB),
          listFxFetches(env.DB),
          getLatestFxRate(env.DB, "USD", "KRW"),
        ]);
        return htmlResponse(statusPage({ runs, errors, fxFetches, fx }));
      }

      const accountMatch = /^\/accounts\/(\d+)$/.exec(pathname);
      if (method === "GET" && accountMatch?.[1]) {
        if (!(await currentSession(env, request))) return redirect("/login");
        return handleAccountDetail(env, Number(accountMatch[1]));
      }

      return htmlResponse(notFoundPage(), 404);
    } catch (error) {
      return jsonResponse({ error: errorMessage(error) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

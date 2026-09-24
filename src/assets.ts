const PALETTE = ["#3b82f6", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e", "#f97316", "#64748b"];

// Width/palette classes let bars render without inline styles, keeping CSP strict.
const WIDTH_CLASSES = Array.from({ length: 101 }, (_, i) => `.w${i}{width:${i}%}`).join("");
const COLOR_CLASSES = PALETTE.map((color, i) => `.c${i}{background-color:${color}}`).join("");

export const STYLES = `:root {
  color-scheme: light dark;
  --fg: #1a1a1a;
  --muted: #6b7280;
  --border: #e5e7eb;
  --bg: #ffffff;
  --up: #b91c1c;
  --down: #1d4ed8;
  --accent: #2563eb;
  --accent-soft: rgba(37, 99, 235, 0.15);
}
@media (prefers-color-scheme: dark) {
  :root {
    --fg: #e5e7eb;
    --muted: #9ca3af;
    --border: #374151;
    --bg: #111827;
    --up: #f87171;
    --down: #60a5fa;
    --accent: #60a5fa;
    --accent-soft: rgba(96, 165, 250, 0.2);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 1.5rem;
  background: var(--bg);
  color: var(--fg);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-text-size-adjust: 100%;
}
header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}
h1 { font-size: 1.25rem; margin: 0; }
h2 { font-size: 1rem; margin: 1.5rem 0 0.5rem; }
h2 .muted { font-weight: 400; }
a { color: inherit; text-decoration: none; }
a.back { display: inline-block; padding: 0.2rem 0; color: var(--muted); }
.muted { color: var(--muted); }
.label-sub { font-size: 0.8em; font-weight: 400; }
.table-scroll { overflow-x: auto; margin-top: 0.5rem; -webkit-overflow-scrolling: touch; }
.table-scroll table { margin-top: 0; }
.up { color: var(--up); }
.down { color: var(--down); }
table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
th, td { text-align: right; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); }
th:first-child, td:first-child { text-align: left; }
th { color: var(--muted); font-weight: 500; }
.num { font-variant-numeric: tabular-nums; }
.cards { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem; }
.card { border: 1px solid var(--border); border-radius: 8px; padding: 1rem; min-width: 240px; }
.card h3 { margin: 0 0 0.5rem; font-size: 1rem; }
.card dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 0.25rem 1rem; }
.card dt { color: var(--muted); }
.card dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
button {
  font: inherit;
  padding: 0.6rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--fg);
  color: var(--bg);
  cursor: pointer;
}
button:disabled { opacity: 0.5; cursor: default; }
input {
  font: inherit;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: transparent;
  color: inherit;
}
.login { max-width: 360px; margin: 10vh auto; display: flex; flex-direction: column; gap: 0.75rem; }
.login label { display: flex; flex-direction: column; gap: 0.25rem; }
.error { color: var(--up); }
#status { min-height: 1.5em; }
.bar { height: 0.5rem; background: var(--border); border-radius: 999px; overflow: hidden; }
.bar .fill { display: block; height: 100%; border-radius: inherit; }
.composition { display: flex; height: 0.6rem; border-radius: 999px; overflow: hidden; background: var(--border); margin: 0.5rem 0 0.4rem; }
.composition .fill { display: block; height: 100%; }
.legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.2rem 0.9rem; font-size: 0.85em; color: var(--muted); }
.legend li { display: flex; align-items: center; gap: 0.35rem; }
.dot { width: 0.6rem; height: 0.6rem; border-radius: 999px; flex: 0 0 auto; }
.alloc { display: none; }
.chart { margin: 0.5rem 0 0; }
.chart-head, .chart-foot { display: flex; justify-content: space-between; gap: 1rem; font-size: 0.85em; }
.chart-head { margin-bottom: 0.35rem; }
.chart-foot { margin-top: 0.35rem; }
.spark { display: block; width: 100%; height: 160px; }
.spark .line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.spark .area { fill: var(--accent-soft); stroke: none; }
${WIDTH_CLASSES}
${COLOR_CLASSES}
details { margin-top: 0.5rem; }
details > summary {
  cursor: pointer;
  color: var(--muted);
  padding: 0.5rem 0;
  list-style-position: inside;
}

@media (max-width: 640px) {
  body { padding: 0.75rem; }
  header { flex-wrap: wrap; align-items: center; margin-bottom: 1rem; padding-bottom: 0.6rem; }
  h1 { font-size: 1.1rem; }
  h2 { font-size: 0.95rem; margin: 1.1rem 0 0.4rem; }
  button { padding: 0.5rem 0.85rem; }
  .card { width: 100%; min-width: 0; padding: 0.85rem; }
  .card dl { gap: 0.2rem 0.75rem; }

  table.responsive thead { display: none; }
  table.responsive,
  table.responsive tbody,
  table.responsive tr,
  table.responsive td { display: block; width: 100%; }
  table.responsive tr {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    margin-bottom: 0.55rem;
  }
  table.responsive td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    text-align: right;
    border: 0;
    padding: 0.22rem 0;
  }
  table.responsive td::before {
    content: attr(data-label);
    color: var(--muted);
    text-align: left;
    flex: 0 0 auto;
  }
  table.responsive td.row-title {
    display: block;
    text-align: left;
    font-weight: 600;
    padding: 0 0 0.4rem;
    margin-bottom: 0.3rem;
    border-bottom: 1px solid var(--border);
  }
  table.responsive td.row-title::before { content: none; }
  table.responsive td.row-title .muted { font-weight: 400; }
  table.responsive td.num { white-space: nowrap; }
  table.responsive td.weight-cell { display: none; }
  .alloc { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.35rem; }
  .alloc .bar { flex: 1 1 auto; }
  .alloc .pct { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
  .spark { height: 120px; }
  .table-scroll table { min-width: 520px; }
}
`;

export const CLIENT_JS = `(function () {
  "use strict";

  function b64urlToBytes(value) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bytesToB64url(input) {
    const bytes = new Uint8Array(input);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || response.statusText);
    return data;
  }

  function registrationJson(credential) {
    const response = credential.response;
    return {
      id: credential.id,
      rawId: bytesToB64url(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment || undefined,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: {
        clientDataJSON: bytesToB64url(response.clientDataJSON),
        attestationObject: bytesToB64url(response.attestationObject),
        transports: response.getTransports ? response.getTransports() : undefined,
      },
    };
  }

  function authenticationJson(credential) {
    const response = credential.response;
    return {
      id: credential.id,
      rawId: bytesToB64url(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment || undefined,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: {
        clientDataJSON: bytesToB64url(response.clientDataJSON),
        authenticatorData: bytesToB64url(response.authenticatorData),
        signature: bytesToB64url(response.signature),
        userHandle: response.userHandle ? bytesToB64url(response.userHandle) : undefined,
      },
    };
  }

  async function register(label, setupToken) {
    const options = await postJson("/auth/register/options", { setupToken: setupToken });
    options.challenge = b64urlToBytes(options.challenge);
    options.user.id = b64urlToBytes(options.user.id);
    if (options.excludeCredentials) {
      options.excludeCredentials = options.excludeCredentials.map(function (c) {
        return { id: b64urlToBytes(c.id), type: c.type, transports: c.transports };
      });
    }
    const credential = await navigator.credentials.create({ publicKey: options });
    if (!credential) throw new Error("registration cancelled");
    await postJson("/auth/register/verify", { label: label, response: registrationJson(credential) });
    window.location.href = "/";
  }

  async function login() {
    const options = await postJson("/auth/login/options", {});
    options.challenge = b64urlToBytes(options.challenge);
    if (options.allowCredentials) {
      options.allowCredentials = options.allowCredentials.map(function (c) {
        return { id: b64urlToBytes(c.id), type: c.type, transports: c.transports };
      });
    }
    const credential = await navigator.credentials.get({ publicKey: options });
    if (!credential) throw new Error("login cancelled");
    await postJson("/auth/login/verify", { response: authenticationJson(credential) });
    window.location.href = "/";
  }

  function setStatus(text, isError) {
    const el = document.getElementById("status");
    if (el) {
      el.textContent = text;
      el.className = isError ? "error" : "";
    }
  }

  function value(id) {
    const el = document.getElementById(id);
    return el ? el.value : undefined;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.dataset.page;
    const loginButton = document.getElementById("login-button");
    const registerButton = document.getElementById("register-button");

    if (page === "login" && loginButton) {
      loginButton.addEventListener("click", async function () {
        loginButton.disabled = true;
        setStatus("passkey로 인증하는 중...", false);
        try {
          await login();
        } catch (error) {
          setStatus(String((error && error.message) || error), true);
          loginButton.disabled = false;
        }
      });
    }

    if (page === "register" && registerButton) {
      registerButton.addEventListener("click", async function () {
        registerButton.disabled = true;
        setStatus("passkey를 등록하는 중...", false);
        try {
          await register(value("label") || undefined, value("setup-token") || undefined);
        } catch (error) {
          setStatus(String((error && error.message) || error), true);
          registerButton.disabled = false;
        }
      });
    }
  });
})();
`;

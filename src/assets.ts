const PALETTE = ["#3b82f6", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e", "#f97316", "#64748b"];

// Width/palette classes let bars render without inline styles, keeping CSP strict.
const WIDTH_CLASSES = Array.from({ length: 101 }, (_, i) => `.w${i}{width:${i}%}`).join("");
const COLOR_CLASSES = PALETTE.map((color, i) => `.c${i}{background-color:${color}}`).join("");

export const STYLES = `:root {
  color-scheme: light;
  --fg: #1a1a1a;
  --muted: #6b7280;
  --border: #e5e7eb;
  --bg: #ffffff;
  --up: #b91c1c;
  --down: #1d4ed8;
  --accent: #2563eb;
  --accent-soft: rgba(37, 99, 235, 0.15);
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
.chart-plot { position: relative; }
.chart-hint { display: none; }
.chart.is-enhanced .chart-hint { display: inline; }
.cursor-line { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--accent); opacity: 0.55; }
.cursor-dot { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg); box-sizing: border-box; }
.chart-tip { position: absolute; z-index: 2; pointer-events: none; min-width: 7rem; padding: 0.4rem 0.55rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); font-size: 0.8rem; line-height: 1.35; }
.chart-tip[hidden] { display: none; }
.chart-tip .tip-time { color: var(--muted); font-size: 0.92em; }
.chart-tip .tip-value { font-weight: 600; font-variant-numeric: tabular-nums; }
.chart-tip .tip-sub { color: var(--muted); font-variant-numeric: tabular-nums; }
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
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

  function nearestIndex(points, ratio) {
    const target = ratio * 100;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < points.length; i += 1) {
      const distance = Math.abs(points[i][0] - target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }

  function enhanceChart(figure) {
    let points;
    try {
      points = JSON.parse(figure.getAttribute("data-points") || "[]");
    } catch (error) {
      return;
    }
    if (!points || !points.length) return;

    const plot = figure.querySelector(".chart-plot");
    const cursor = figure.querySelector(".cursor");
    const line = figure.querySelector(".cursor-line");
    const dot = figure.querySelector(".cursor-dot");
    const tip = figure.querySelector(".chart-tip");
    const tipTime = figure.querySelector(".tip-time");
    const tipValue = figure.querySelector(".tip-value");
    const tipSub = figure.querySelector(".tip-sub");
    const live = figure.querySelector(".visually-hidden");
    if (!plot || !cursor || !line || !dot || !tip) return;

    let index = -1;
    let pinned = false;

    function render(i) {
      index = i;
      const point = points[i];
      const width = plot.clientWidth;
      const height = plot.clientHeight;
      const left = (point[0] / 100) * width;
      const top = (point[1] / 100) * height;
      cursor.hidden = false;
      line.style.left = left + "px";
      dot.style.left = left + "px";
      dot.style.top = top + "px";
      tipTime.textContent = point[2];
      tipValue.textContent = point[3];
      if (point[4]) {
        tipSub.textContent = point[4];
        tipSub.hidden = false;
      } else {
        tipSub.textContent = "";
        tipSub.hidden = true;
      }
      tip.hidden = false;
      const tipWidth = tip.offsetWidth;
      const tipHeight = tip.offsetHeight;
      let tipLeft = left;
      if (tipLeft - tipWidth / 2 < 0) tipLeft = tipWidth / 2;
      if (tipLeft + tipWidth / 2 > width) tipLeft = width - tipWidth / 2;
      let tipTop = top - tipHeight - 10;
      if (tipTop < 0) tipTop = top + 12;
      tip.style.left = tipLeft + "px";
      tip.style.top = tipTop + "px";
      if (live) live.textContent = point[2] + " " + point[3] + (point[4] ? ", " + point[4] : "");
    }

    function hide() {
      if (pinned) return;
      cursor.hidden = true;
      tip.hidden = true;
      index = -1;
    }

    function indexFromX(clientX) {
      const rect = plot.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      return nearestIndex(points, (clientX - rect.left) / rect.width);
    }

    plot.addEventListener("pointermove", function (event) {
      if (event.pointerType === "mouse") render(indexFromX(event.clientX));
    });
    plot.addEventListener("pointerleave", function () {
      hide();
    });
    plot.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse") return;
      pinned = true;
      render(indexFromX(event.clientX));
    });
    plot.addEventListener("keydown", function (event) {
      let next = index;
      if (event.key === "ArrowRight") next = index < 0 ? 0 : Math.min(points.length - 1, index + 1);
      else if (event.key === "ArrowLeft") next = index < 0 ? points.length - 1 : Math.max(0, index - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = points.length - 1;
      else if (event.key === "Escape") {
        pinned = false;
        hide();
        return;
      } else {
        return;
      }
      event.preventDefault();
      render(next);
    });
    plot.addEventListener("blur", function () {
      pinned = false;
      hide();
    });
    window.addEventListener("resize", function () {
      if (index >= 0) render(index);
    });

    figure.classList.add("is-enhanced");
  }

  function enhanceCharts() {
    const charts = document.querySelectorAll(".chart[data-points]");
    for (let i = 0; i < charts.length; i += 1) enhanceChart(charts[i]);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.body.dataset.page;
    const loginButton = document.getElementById("login-button");
    const registerButton = document.getElementById("register-button");
    enhanceCharts();

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

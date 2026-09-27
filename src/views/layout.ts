import { html, safe, type SafeHtml } from "../lib/html";

export interface LayoutOptions {
  title: string;
  page?: string;
  showNav?: boolean;
  /** Extra content shown in the header, left of the logout button. */
  navExtra?: SafeHtml;
  body: SafeHtml;
}

function nav(navExtra?: SafeHtml): SafeHtml {
  return html`<header>
  <h1><a href="/">Asset Tracker</a></h1>
  <div class="nav-actions">${navExtra}<a class="nav-button" href="/status">상태</a><form method="post" action="/auth/logout"><button type="submit" class="nav-button nav-primary">로그아웃</button></form></div>
</header>`;
}

export function layout(options: LayoutOptions): SafeHtml {
  return html`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${options.title}</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#104879">
<link rel="manifest" href="/site.webmanifest">
<link rel="stylesheet" href="/style.css">
</head>
<body data-page="${options.page ?? ""}">
${options.showNav ? nav(options.navExtra) : safe("")}
<main>${options.body}</main>
<script src="/client.js" defer></script>
</body>
</html>`;
}

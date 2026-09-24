import { html, safe, type SafeHtml } from "../lib/html";

export interface LayoutOptions {
  title: string;
  page?: string;
  showNav?: boolean;
  body: SafeHtml;
}

function nav(): SafeHtml {
  return html`<header>
  <h1><a href="/">Asset Tracker</a></h1>
  <form method="post" action="/auth/logout"><button type="submit">로그아웃</button></form>
</header>`;
}

export function layout(options: LayoutOptions): SafeHtml {
  return html`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${options.title}</title>
<link rel="stylesheet" href="/style.css">
</head>
<body data-page="${options.page ?? ""}">
${options.showNav ? nav() : safe("")}
<main>${options.body}</main>
<script src="/client.js" defer></script>
</body>
</html>`;
}

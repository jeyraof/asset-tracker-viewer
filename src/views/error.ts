import { html, type SafeHtml } from "../lib/html";
import { layout } from "./layout";

export function notFoundPage(): SafeHtml {
  const body = html`<h2>404</h2>
<p class="muted">요청한 페이지를 찾을 수 없습니다.</p>
<p><a href="/">계좌 목록으로</a></p>`;
  return layout({ title: "찾을 수 없음 · Asset Tracker", showNav: true, body });
}

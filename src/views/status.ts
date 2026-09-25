import type { FxRate } from "../db/portfolio";
import type { FxFetch, SyncError, SyncRun } from "../db/status";
import { formatDate, formatDurationMs, formatKst, formatMoney } from "../lib/format";
import { html, type SafeHtml } from "../lib/html";
import { providerName } from "../lib/labels";
import { layout } from "./layout";
import { fxLink } from "./portfolio";

const STATUS_LABELS: Record<string, string> = {
  success: "성공",
  partial: "부분",
  failed: "실패",
  running: "진행 중",
};

function statusText(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function statusClass(status: string): string {
  if (status === "failed") return "up";
  if (status === "partial") return "down";
  return "muted";
}

function providerLabel(provider: string | null): string {
  return provider ? providerName(provider) : "전체";
}

function runsTable(runs: SyncRun[]): SafeHtml {
  const rows = runs.map(
    (run) => html`<tr>
  <td class="row-title" data-label="시각(KST)">${formatKst(run.startedAt)}</td>
  <td data-label="대상">${providerLabel(run.provider)}</td>
  <td data-label="트리거">${run.source}</td>
  <td class="${statusClass(run.status)}" data-label="상태">${statusText(run.status)}</td>
  <td class="num" data-label="소요">${formatDurationMs(run.durationMs)}</td>
  <td class="num" data-label="오류">${run.errorCount}</td>
</tr>`,
  );
  return html`<table class="responsive">
  <thead><tr><th>시각(KST)</th><th>대상</th><th>트리거</th><th>상태</th><th>소요</th><th>오류</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function fxTable(fetches: FxFetch[]): SafeHtml {
  const rows = fetches.map(
    (fetch) => html`<tr>
  <td class="row-title" data-label="소스">${fetch.provider ? providerName(fetch.provider) : "-"}<div class="muted">${fetch.source ?? ""}</div></td>
  <td data-label="마지막 수집(KST)">${formatKst(fetch.fetchedAt)}</td>
  <td data-label="기준일">${formatDate(fetch.date)}</td>
  <td class="num" data-label="환율">${formatMoney(fetch.rate, "KRW")}</td>
</tr>`,
  );
  return html`<table class="responsive">
  <thead><tr><th>소스</th><th>마지막 수집(KST)</th><th>기준일</th><th>환율</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function errorsTable(errors: SyncError[]): SafeHtml {
  const rows = errors.map(
    (error) => html`<tr>
  <td class="row-title" data-label="시각(KST)">${formatKst(error.createdAt)}</td>
  <td data-label="대상">${error.provider ? providerName(error.provider) : "-"}<div class="muted">${error.scope}</div></td>
  <td data-label="심볼">${error.symbol ?? "-"}<div class="muted">${error.code ?? ""}</div></td>
  <td data-label="메시지">${error.message}</td>
</tr>`,
  );
  return html`<table class="responsive">
  <thead><tr><th>시각(KST)</th><th>대상</th><th>심볼</th><th>메시지</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

export interface StatusPageInput {
  runs: SyncRun[];
  errors: SyncError[];
  fxFetches: FxFetch[];
  fx: FxRate | null;
}

export function statusPage(input: StatusPageInput): SafeHtml {
  const { runs, errors, fxFetches, fx } = input;
  const body = html`<h2>수집 현황</h2>
${runs.length === 0 ? html`<p class="muted">수집 기록이 없습니다.</p>` : runsTable(runs)}
<h2>환율 수집</h2>
${fxFetches.length === 0 ? html`<p class="muted">환율 수집 기록이 없습니다.</p>` : fxTable(fxFetches)}
<h2>최근 오류</h2>
${errors.length === 0 ? html`<p class="muted">오류 없음</p>` : errorsTable(errors)}`;

  return layout({ title: "상태 · Asset Tracker", showNav: true, navExtra: fxLink(fx), body });
}

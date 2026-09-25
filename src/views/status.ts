import type { FxRate } from "../db/portfolio";
import type { SyncError, SyncRun } from "../db/status";
import { formatDate, formatDurationMs, formatKst } from "../lib/format";
import { html, type SafeHtml } from "../lib/html";
import { providerName } from "../lib/labels";
import { layout } from "./layout";
import { fxLink } from "./portfolio";

const TASK_LABELS: Record<string, string> = {
  sync: "동기화",
  fx: "환율",
};

const STATUS_LABELS: Record<string, string> = {
  success: "성공",
  partial: "부분",
  failed: "실패",
  running: "진행 중",
};

function taskText(task: string): string {
  return TASK_LABELS[task] ?? task;
}

function statusText(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function statusClass(status: string): string {
  if (status === "failed") return "up";
  if (status === "partial") return "down";
  return "muted";
}

function targetLabel(run: SyncRun): string {
  if (run.provider) return providerName(run.provider);
  if (run.providers.length > 0) return run.providers.map(providerName).join(", ");
  return "전체";
}

function targetSummary(run: SyncRun): string | null {
  const counts = run.counts;
  if (run.task === "fx") return counts.rates > 0 ? `환율 ${counts.rates}건` : null;
  const parts: string[] = [];
  if (counts.accounts > 0) parts.push(`계좌 ${counts.accounts}`);
  if (counts.holdings > 0) parts.push(`보유 ${counts.holdings}`);
  if (counts.trades > 0) parts.push(`체결 ${counts.trades}`);
  if (counts.quotes > 0) parts.push(`시세 ${counts.quotes}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function runsTable(runs: SyncRun[]): SafeHtml {
  const rows = runs.map((run) => {
    const summary = targetSummary(run);
    return html`<tr>
  <td class="row-title" data-label="시각(KST)">${formatKst(run.startedAt)}</td>
  <td data-label="작업">${taskText(run.task)}</td>
  <td data-label="대상">${targetLabel(run)}${summary ? html`<div class="muted label-sub">${summary}</div>` : html``}</td>
  <td data-label="트리거">${run.source}</td>
  <td class="${statusClass(run.status)}" data-label="상태">${statusText(run.status)}</td>
  <td class="num" data-label="소요">${formatDurationMs(run.durationMs)}</td>
  <td class="num" data-label="오류">${run.errorCount}</td>
</tr>`;
  });
  return html`<table class="responsive">
  <thead><tr><th>시각(KST)</th><th>작업</th><th>대상</th><th>트리거</th><th>상태</th><th>소요</th><th>오류</th></tr></thead>
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
  fx: FxRate | null;
}

export function statusPage(input: StatusPageInput): SafeHtml {
  const { runs, errors, fx } = input;
  const body = html`<h2>수집 현황</h2>
${runs.length === 0 ? html`<p class="muted">수집 기록이 없습니다.</p>` : runsTable(runs)}
<h2>최근 오류</h2>
${errors.length === 0 ? html`<p class="muted">오류 없음</p>` : errorsTable(errors)}`;

  return layout({ title: "상태 · Asset Tracker", showNav: true, navExtra: fxLink(fx), body });
}

import type {
  Account,
  AccountSummary,
  FxRate,
  Holding,
  SnapshotPoint,
  Trade,
} from "../db/portfolio";
import { formatDate, formatMoney, formatPercent, formatPercentPlain, formatQuantity, formatSignedMoney, pnlClass } from "../lib/format";
import { html, type SafeHtml } from "../lib/html";
import { layout } from "./layout";

function accountTitle(account: {
  alias: string | null;
  name: string | null;
  provider: string;
}): { primary: string; parenthetical: string | null } {
  const alias = account.alias?.trim();
  const name = account.name?.trim();
  if (alias) return { primary: alias, parenthetical: name ? name : null };
  return { primary: name ? name : account.provider, parenthetical: null };
}

/** Primary label is the alias when set, with the original name shown in small text. */
function accountLabel(account: {
  alias: string | null;
  name: string | null;
  provider: string;
}): SafeHtml {
  const { primary, parenthetical } = accountTitle(account);
  return parenthetical
    ? html`${primary} <span class="muted label-sub">(${parenthetical})</span>`
    : html`${primary}`;
}

function krwNetValue(summary: AccountSummary, fx: FxRate | null): number {
  const value = summary.netAssetAmount ?? 0;
  if (summary.currency === "KRW" || fx === null) return value;
  return value * fx.rate;
}

function byNetDesc(fx: FxRate | null) {
  return (a: AccountSummary, b: AccountSummary) => krwNetValue(b, fx) - krwNetValue(a, fx) || a.id - b.id;
}

function accountsTable(accounts: AccountSummary[], fx: FxRate | null): SafeHtml {
  const rows = accounts.map(
    (account) => html`<tr>
  <td class="row-title" data-label="계좌"><a href="/accounts/${account.id}">${accountLabel(account)}</a><div class="muted">${account.provider} · ${account.country}</div></td>
  <td class="num" data-label="기준일">${formatDate(account.snapshotDate)}</td>
  <td class="num" data-label="순자산">${formatMoney(account.netAssetAmount, account.currency)}</td>
  <td class="num" data-label="평가금액">${formatMoney(account.totalEvalAmount, account.currency)}</td>
  <td class="num ${pnlClass(account.evalPflsAmount)}" data-label="평가손익">${formatSignedMoney(account.evalPflsAmount, account.currency)}</td>
  <td class="num" data-label="예수금">${formatMoney(account.depositTotal, account.currency)}</td>
</tr>`,
  );

  return html`<table class="responsive">
  <thead>
    <tr>
      <th>계좌</th><th>기준일</th><th>순자산</th><th>평가금액</th><th>평가손익</th><th>예수금</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function accountsSection(
  title: string,
  accounts: AccountSummary[],
  fx: FxRate | null,
): SafeHtml {
  if (accounts.length === 0) return html``;
  return html`<h2>${title} <span class="muted">${accounts.length}</span></h2>
${accountsTable(accounts, fx)}`;
}

export function accountsPage(summaries: AccountSummary[], fx: FxRate | null): SafeHtml {
  const investing = summaries.filter((account) => account.holdingCount > 0).sort(byNetDesc(fx));
  const cash = summaries
    .filter((account) => account.holdingCount === 0 && (account.netAssetAmount ?? 0) > 0)
    .sort(byNetDesc(fx));
  const empty = summaries
    .filter((account) => (account.netAssetAmount ?? 0) <= 0)
    .sort((a, b) => a.id - b.id);

  const body = html`${
    summaries.length === 0
      ? html`<h2>계좌</h2><p class="muted">표시할 계좌가 없습니다.</p>`
      : html`${accountsSection("투자 중", investing, fx)}
${accountsSection("잔고 계좌", cash, fx)}
${
  empty.length > 0
    ? html`<details>
  <summary>빈 계좌 <span class="muted">(${empty.length})</span></summary>
  ${accountsTable(empty, fx)}
</details>`
    : html``
}`
  }
${fx ? html`<p class="muted"><a href="/fx">USD/KRW ${formatMoney(fx.rate, "KRW")} (${formatDate(fx.date)})</a></p>` : html``}`;

  return layout({ title: "계좌 · Asset Tracker", showNav: true, body });
}

function summaryList(account: Account, summary: AccountSummary | null, fx: FxRate | null): SafeHtml {
  const currency = account.currency;
  const totalEvalKrw =
    currency !== "KRW" && fx && summary?.totalEvalAmount != null
      ? summary.totalEvalAmount * fx.rate
      : null;

  return html`<div class="card">
  <h3>${accountLabel(account)}</h3>
  <dl>
    <dt>기준일</dt><dd>${formatDate(account.snapshotDate)}</dd>
    <dt>순자산</dt><dd>${formatMoney(summary?.netAssetAmount, currency)}</dd>
    <dt>평가금액</dt><dd>${formatMoney(summary?.totalEvalAmount, currency)}</dd>
    <dt>평가손익</dt><dd class="${pnlClass(summary?.evalPflsAmount)}">${formatSignedMoney(summary?.evalPflsAmount, currency)}</dd>
    <dt>매입금액</dt><dd>${formatMoney(summary?.purchaseAmountTotal, currency)}</dd>
    <dt>예수금</dt><dd>${formatMoney(summary?.depositTotal, currency)}</dd>
    ${totalEvalKrw != null ? html`<dt>평가금액(원화)</dt><dd>${formatMoney(totalEvalKrw, "KRW")}</dd>` : html``}
  </dl>
</div>`;
}

const PALETTE_SIZE = 8;

function holdingsTable(holdings: Holding[]): SafeHtml {
  if (holdings.length === 0) return html`<p class="muted">보유 종목이 없습니다.</p>`;

  const total = holdings.reduce((sum, holding) => sum + (holding.evalAmount ?? 0), 0);
  const weights = holdings.map((holding) =>
    total > 0 && holding.evalAmount != null ? (holding.evalAmount / total) * 100 : null,
  );

  const composition =
    total > 0
      ? html`<div class="composition">${holdings.map((holding, index) => {
          const weight = weights[index];
          if (weight == null || weight <= 0) return html``;
          return html`<span class="fill c${index % PALETTE_SIZE} w${Math.round(weight)}"></span>`;
        })}</div>
<ul class="legend">${holdings.map((holding, index) => {
          const weight = weights[index];
          if (weight == null) return html``;
          return html`<li><span class="dot c${index % PALETTE_SIZE}"></span>${holding.productName ?? holding.symbol} ${formatPercentPlain(weight)}</li>`;
        })}</ul>`
      : html``;

  const rows = holdings.map((holding, index) => {
    const weight = weights[index];
    const color = index % PALETTE_SIZE;
    const allocation =
      weight != null && weight > 0
        ? html`<div class="alloc"><div class="bar"><span class="fill c${color} w${Math.round(weight)}"></span></div><span class="pct">${formatPercentPlain(weight)}</span></div>`
        : html``;
    return html`<tr>
  <td class="row-title" data-label="종목">${holding.productName ?? holding.symbol}<div class="muted">${holding.market} · ${holding.symbol}</div>${allocation}</td>
  <td class="num" data-label="수량">${formatQuantity(holding.quantity)}</td>
  <td class="num" data-label="평단">${formatMoney(holding.avgPrice, holding.currency)}</td>
  <td class="num" data-label="현재가">${formatMoney(holding.currentPrice, holding.currency)}</td>
  <td class="num" data-label="평가금액">${formatMoney(holding.evalAmount, holding.currency)}</td>
  <td class="num weight-cell" data-label="비중">${formatPercentPlain(weight)}</td>
  <td class="num ${pnlClass(holding.evalPflsAmount)}" data-label="평가손익">${formatSignedMoney(holding.evalPflsAmount, holding.currency)}</td>
  <td class="num ${pnlClass(holding.evalPflsAmount)}" data-label="수익률">${formatPercent(holding.evalPflsRate)}</td>
</tr>`;
  });

  return html`${composition}
<table class="responsive">
  <thead>
    <tr>
      <th>종목</th><th>수량</th><th>평단</th><th>현재가</th><th>평가금액</th><th>비중</th><th>평가손익</th><th>수익률</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function historyTable(points: SnapshotPoint[], currency: string): SafeHtml {
  if (points.length === 0) return html`<p class="muted">스냅샷 이력이 없습니다.</p>`;
  const rows = points.map(
    (point) => html`<tr>
  <td class="row-title" data-label="기준일">${formatDate(point.date)}</td>
  <td class="num" data-label="순자산">${formatMoney(point.netAssetAmount, currency)}</td>
  <td class="num" data-label="평가금액">${formatMoney(point.totalEvalAmount, currency)}</td>
  <td class="num ${pnlClass(point.evalPflsAmount)}" data-label="평가손익">${formatSignedMoney(point.evalPflsAmount, currency)}</td>
  <td class="num" data-label="예수금">${formatMoney(point.depositTotal, currency)}</td>
</tr>`,
  );
  return html`<table class="responsive">
  <thead><tr><th>기준일</th><th>순자산</th><th>평가금액</th><th>평가손익</th><th>예수금</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function chartGeometry(data: { value: number }[]): { line: string; area: string } {
  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const count = data.length;

  const coords = data.map((point, index) => {
    const x = count === 1 ? 50 : (index / (count - 1)) * 100;
    const normalized = range === 0 ? 0.5 : (point.value - min) / range;
    return { x: round2(x), y: round2(95 - normalized * 90) };
  });

  const line = coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
  const firstX = coords[0]?.x ?? 0;
  const lastX = coords[coords.length - 1]?.x ?? 100;
  return { line, area: `${firstX},100 ${line} ${lastX},100` };
}

/** Trend as an inline SVG line; no inline styles or scripts, so CSP stays strict. */
function trendChart(
  data: { date: string; value: number }[],
  options: { ariaLabel: string; formatValue: (value: number) => string },
): SafeHtml {
  if (data.length === 0) return html``;

  const values = data.map((point) => point.value);
  const first = data[0];
  const latest = data[data.length - 1];
  const { line, area } = chartGeometry(data);

  return html`<figure class="chart">
  <figcaption class="chart-head">
    <span>최고 ${options.formatValue(Math.max(...values))}</span>
    <span class="muted">최저 ${options.formatValue(Math.min(...values))}</span>
  </figcaption>
  <svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${options.ariaLabel}">
    <polygon class="area" points="${area}"></polygon>
    <polyline class="line" points="${line}"></polyline>
  </svg>
  <div class="chart-foot muted">
    <span>${formatDate(first?.date)}</span>
    <span>${formatDate(latest?.date)}</span>
  </div>
</figure>`;
}

function historyChart(points: SnapshotPoint[], currency: string): SafeHtml {
  const data = points
    .filter((point): point is SnapshotPoint & { netAssetAmount: number } =>
      point.netAssetAmount != null && Number.isFinite(point.netAssetAmount),
    )
    .map((point) => ({ date: point.date, value: point.netAssetAmount }))
    .reverse();
  return trendChart(data, {
    ariaLabel: "순자산 추이",
    formatValue: (value) => formatMoney(value, currency),
  });
}

function historySection(points: SnapshotPoint[], currency: string): SafeHtml {
  if (points.length === 0) return html`<p class="muted">스냅샷 이력이 없습니다.</p>`;
  return html`${historyChart(points, currency)}
<details>
  <summary>표로 보기</summary>
  ${historyTable(points, currency)}
</details>`;
}

function tradesTable(trades: Trade[], currency: string): SafeHtml {
  if (trades.length === 0) return html`<p class="muted">거래 내역이 없습니다.</p>`;
  const rows = trades.map(
    (trade) => html`<tr>
  <td>${trade.productName ?? trade.symbol}<div class="muted">${trade.market} · ${trade.symbol}</div></td>
  <td>${formatDate(trade.date)}<div class="muted">${trade.orderTime ?? ""}</div></td>
  <td>${trade.side === "BUY" ? "매수" : "매도"}</td>
  <td class="num">${formatQuantity(trade.quantity)}</td>
  <td class="num">${formatMoney(trade.avgPrice, trade.currency ?? currency)}</td>
  <td class="num">${formatMoney(trade.amount, trade.currency ?? currency)}</td>
</tr>`,
  );
  return html`<div class="table-scroll">
<table>
  <thead><tr><th>종목</th><th>일자</th><th>구분</th><th>수량</th><th>단가</th><th>금액</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>`;
}

export interface AccountDetail {
  account: Account;
  summary: AccountSummary | null;
  holdings: Holding[];
  history: SnapshotPoint[];
  trades: Trade[];
  fx: FxRate | null;
}

export function accountPage(detail: AccountDetail): SafeHtml {
  const { account, summary, holdings, history, trades, fx } = detail;
  const body = html`<p><a class="back" href="/">← 계좌 목록</a></p>
<h2>${accountLabel(account)} <span class="muted">${account.provider} · ${account.country} · ${account.currency}</span></h2>
${summaryList(account, summary, fx)}
<h2>보유 종목</h2>
${holdingsTable(holdings)}
<h2>스냅샷 이력</h2>
${historySection(history, account.currency)}
<h2>최근 거래</h2>
${tradesTable(trades, account.currency)}`;

  return layout({ title: `${accountTitle(account).primary} · Asset Tracker`, showNav: true, body });
}

function fxTable(rates: FxRate[]): SafeHtml {
  if (rates.length === 0) return html`<p class="muted">환율 이력이 없습니다.</p>`;
  const rows = rates.map(
    (rate) => html`<tr>
  <td class="row-title" data-label="기준일">${formatDate(rate.date)}</td>
  <td class="num" data-label="환율">${formatMoney(rate.rate, "KRW")}</td>
</tr>`,
  );
  return html`<table class="responsive">
  <thead><tr><th>기준일</th><th>환율</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

export function fxPage(base: string, quote: string, rates: FxRate[]): SafeHtml {
  const latest = rates[0] ?? null;
  const data = rates
    .slice()
    .reverse()
    .map((rate) => ({ date: rate.date, value: rate.rate }));

  const body = html`<p><a class="back" href="/">← 계좌 목록</a></p>
<h2>${base}/${quote} 환율</h2>
${
  latest
    ? html`<div class="card">
  <dl>
    <dt>최신 환율</dt><dd>${formatMoney(latest.rate, "KRW")}</dd>
    <dt>기준일</dt><dd>${formatDate(latest.date)}</dd>
  </dl>
</div>`
    : html`<p class="muted">환율 이력이 없습니다.</p>`
}
${trendChart(data, {
  ariaLabel: `${base}/${quote} 환율 추이`,
  formatValue: (value) => formatMoney(value, "KRW"),
})}
${
  rates.length > 0
    ? html`<details>
  <summary>표로 보기</summary>
  ${fxTable(rates)}
</details>`
    : html``
}`;

  return layout({ title: `${base}/${quote} 환율 · Asset Tracker`, showNav: true, body });
}

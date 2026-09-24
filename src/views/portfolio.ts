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
import { evalAmount, netAsset } from "../lib/amounts";
import { areaPoints, linePoints, plotCoords, serializeChartPoints } from "../lib/chartData";
import { countryFlag, providerName } from "../lib/labels";
import { layout } from "./layout";

function accountTitle(account: {
  alias: string | null;
  name: string | null;
  externalId: string;
  provider: string;
}): { primary: string; parenthetical: string | null } {
  const alias = account.alias?.trim();
  const name = account.name?.trim();
  const externalId = account.externalId?.trim();
  if (alias) return { primary: alias, parenthetical: externalId ? externalId : null };
  return { primary: name ? name : providerName(account.provider), parenthetical: null };
}

/** Primary label is the alias when set, with the account id shown in small text. */
function accountLabel(account: {
  alias: string | null;
  name: string | null;
  externalId: string;
  provider: string;
}): SafeHtml {
  const { primary, parenthetical } = accountTitle(account);
  return parenthetical
    ? html`${primary} <span class="muted label-sub">(${parenthetical})</span>`
    : html`${primary}`;
}

/** Converts a value to KRW when it is in the fx base currency; otherwise returns it as-is. */
function krwAmount(value: number | null | undefined, currency: string, fx: FxRate | null): number {
  if (value == null || !Number.isFinite(value)) return 0;
  if (fx === null || currency !== fx.base) return value;
  return value * fx.rate;
}

function krwNetValue(summary: AccountSummary, fx: FxRate | null): number {
  return krwAmount(netAsset(summary), summary.currency, fx);
}

/**
 * Money cell: converts to KRW using the latest fx rate when the value is in the
 * fx base currency, showing the original amount in small text underneath.
 */
function moneyCell(
  value: number | null | undefined,
  currency: string,
  fx: FxRate | null,
  signed = false,
): SafeHtml {
  const format = signed ? formatSignedMoney : formatMoney;
  if (!fx || currency !== fx.base || value == null || !Number.isFinite(value)) {
    return html`${format(value, currency)}`;
  }
  return html`${format(value * fx.rate, "KRW")}<div class="muted label-sub">${format(value, currency)}</div>`;
}

function byNetDesc(fx: FxRate | null) {
  return (a: AccountSummary, b: AccountSummary) => krwNetValue(b, fx) - krwNetValue(a, fx) || a.id - b.id;
}

/** USD/KRW link shown in the header, to the left of the logout button. */
function fxLink(fx: FxRate | null): SafeHtml {
  return fx
    ? html`<a class="nav-fx" href="/fx">USD/KRW ${formatMoney(fx.rate, "KRW")} (${formatDate(fx.date)})</a>`
    : html``;
}

function accountsTable(accounts: AccountSummary[], fx: FxRate | null, showTotal = false): SafeHtml {
  const rows = accounts.map(
    (account) => html`<tr>
  <td class="row-title" data-label="계좌"><a href="/accounts/${account.id}">${accountLabel(account)}</a><div class="muted"><span title="${account.provider}">${providerName(account.provider)}</span> · ${countryFlag(account.country)}</div></td>
  <td class="num" data-label="기준일">${formatDate(account.snapshotDate)}</td>
  <td class="num" data-label="순자산">${moneyCell(netAsset(account), account.currency, fx)}</td>
  <td class="num" data-label="평가금액">${moneyCell(evalAmount(account), account.currency, fx)}</td>
  <td class="num ${pnlClass(account.evalPflsAmount)}" data-label="평가손익">${moneyCell(account.evalPflsAmount, account.currency, fx, true)}</td>
  <td class="num" data-label="예수금">${moneyCell(account.depositTotal, account.currency, fx)}</td>
</tr>`,
  );

  const canTotal = fx !== null || accounts.every((account) => account.currency === "KRW");
  const total =
    showTotal && canTotal
      ? {
          netAsset: accounts.reduce((sum, account) => sum + krwAmount(netAsset(account), account.currency, fx), 0),
          evalAmount: accounts.reduce((sum, account) => sum + krwAmount(evalAmount(account), account.currency, fx), 0),
          evalPfls: accounts.reduce((sum, account) => sum + krwAmount(account.evalPflsAmount, account.currency, fx), 0),
        }
      : null;

  const footer = total
    ? html`<tfoot>
    <tr>
      <td class="row-title" data-label="합계">합계</td>
      <td class="tfoot-empty"></td>
      <td class="num" data-label="순자산">${formatMoney(total.netAsset, "KRW")}</td>
      <td class="num" data-label="평가금액">${formatMoney(total.evalAmount, "KRW")}</td>
      <td class="num ${pnlClass(total.evalPfls)}" data-label="평가손익">${formatSignedMoney(total.evalPfls, "KRW")}</td>
      <td class="tfoot-empty"></td>
    </tr>
  </tfoot>`
    : html``;

  return html`<table class="responsive">
  <thead>
    <tr>
      <th>계좌</th><th>기준일</th><th>순자산</th><th>평가금액</th><th>평가손익</th><th>예수금</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  ${footer}
</table>`;
}

function accountsSection(
  title: string,
  accounts: AccountSummary[],
  fx: FxRate | null,
  showTotal = false,
): SafeHtml {
  if (accounts.length === 0) return html``;
  return html`<h2>${title} <span class="muted">${accounts.length}</span></h2>
${accountsTable(accounts, fx, showTotal)}`;
}

export function accountsPage(summaries: AccountSummary[], fx: FxRate | null): SafeHtml {
  const investing = summaries.filter((account) => account.holdingCount > 0).sort(byNetDesc(fx));
  const other = summaries.filter((account) => account.holdingCount === 0).sort(byNetDesc(fx));

  const body = html`${
    summaries.length === 0
      ? html`<h2>계좌</h2><p class="muted">표시할 계좌가 없습니다.</p>`
      : html`${accountsSection("투자 중", investing, fx, true)}
${accountsSection("기타 계좌", other, fx)}`
  }`;

  return layout({ title: "계좌 · Asset Tracker", showNav: true, navExtra: fxLink(fx), body });
}

function summaryList(account: Account, summary: AccountSummary | null, fx: FxRate | null): SafeHtml {
  const currency = account.currency;

  return html`<div class="card">
  <dl>
    <dt>기준일</dt><dd>${formatDate(account.snapshotDate)}</dd>
    <dt>순자산</dt><dd>${moneyCell(summary ? netAsset(summary) : null, currency, fx)}</dd>
    <dt>평가금액</dt><dd>${moneyCell(summary ? evalAmount(summary) : null, currency, fx)}</dd>
    <dt>평가손익</dt><dd class="${pnlClass(summary?.evalPflsAmount)}">${moneyCell(summary?.evalPflsAmount, currency, fx, true)}</dd>
    <dt>매입금액</dt><dd>${moneyCell(summary?.purchaseAmountTotal, currency, fx)}</dd>
    <dt>예수금</dt><dd>${moneyCell(summary?.depositTotal, currency, fx)}</dd>
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
  <td class="num" data-label="순자산">${formatMoney(netAsset(point), currency)}</td>
  <td class="num" data-label="평가금액">${formatMoney(evalAmount(point), currency)}</td>
  <td class="num ${pnlClass(point.evalPflsAmount)}" data-label="평가손익">${formatSignedMoney(point.evalPflsAmount, currency)}</td>
  <td class="num" data-label="예수금">${formatMoney(point.depositTotal, currency)}</td>
</tr>`,
  );
  return html`<table class="responsive">
  <thead><tr><th>기준일</th><th>순자산</th><th>평가금액</th><th>평가손익</th><th>예수금</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

interface TrendPoint {
  date: string;
  value: number;
  sub: string | null;
}

/** Trend as an inline SVG line plus an HTML cursor overlay enhanced by /client.js. */
function trendChart(
  data: readonly TrendPoint[],
  options: { ariaLabel: string; formatValue: (value: number) => string },
): SafeHtml {
  if (data.length === 0) return html``;

  const values = data.map((point) => point.value);
  const coords = plotCoords(values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const first = data[0];
  const latest = data[data.length - 1];
  const dataPoints = serializeChartPoints(
    data.map((point, index) => ({
      x: coords[index]?.x ?? 0,
      y: coords[index]?.y ?? 0,
      date: point.date,
      value: options.formatValue(point.value),
      sub: point.sub ?? "",
    })),
  );

  return html`<figure class="chart" data-points="${dataPoints}">
  <figcaption class="chart-head">
    <span>최고 ${options.formatValue(Math.max(...values))}</span>
    <span class="muted">최저 ${options.formatValue(Math.min(...values))}</span>
    <span class="muted">평균 ${options.formatValue(average)}</span>
  </figcaption>
  <div class="chart-plot" tabindex="0" role="group" aria-label="${options.ariaLabel}">
    <svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polygon class="area" points="${areaPoints(coords)}"></polygon>
      <polyline class="line" points="${linePoints(coords)}"></polyline>
    </svg>
    <div class="cursor" hidden><span class="cursor-line"></span><span class="cursor-dot"></span></div>
    <div class="chart-tip" hidden>
      <div class="tip-time"></div>
      <div class="tip-value"></div>
      <div class="tip-sub"></div>
    </div>
    <span class="visually-hidden" aria-live="polite"></span>
  </div>
  <div class="chart-foot muted">
    <span>${formatDate(first?.date)}</span>
    <span class="chart-hint" hidden>마우스를 올리면 표시되고, 터치하면 선택한 값이 고정됩니다.</span>
    <span>${formatDate(latest?.date)}</span>
  </div>
</figure>`;
}

function historyChart(points: SnapshotPoint[], currency: string): SafeHtml {
  const data = points
    .map((point) => ({
      date: point.date,
      value: netAsset(point),
      sub: point.evalPflsAmount != null ? `평가손익 ${formatSignedMoney(point.evalPflsAmount, currency)}` : null,
    }))
    .filter((point): point is TrendPoint & { value: number } => point.value != null && Number.isFinite(point.value))
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
<h2>${accountLabel(account)} <span class="muted"><span title="${account.provider}">${providerName(account.provider)}</span> · ${countryFlag(account.country)} · ${account.currency}</span></h2>
${summaryList(account, summary, fx)}
<h2>보유 종목</h2>
${holdingsTable(holdings)}
<h2>스냅샷 이력</h2>
${historySection(history, account.currency)}
<h2>최근 거래</h2>
${tradesTable(trades, account.currency)}`;

  return layout({ title: `${accountTitle(account).primary} · Asset Tracker`, showNav: true, navExtra: fxLink(fx), body });
}

function fxTable(rates: FxRate[]): SafeHtml {
  if (rates.length === 0) return html`<p class="muted">환율 이력이 없습니다.</p>`;
  const rows = rates.map((rate, index) => {
    const previous = rates[index + 1];
    const change = previous ? rate.rate - previous.rate : null;
    const pct = previous && previous.rate !== 0 ? ((rate.rate - previous.rate) / previous.rate) * 100 : null;
    const changeText = change == null ? "-" : `${formatSignedMoney(change, "KRW")} (${formatPercent(pct)})`;
    return html`<tr>
  <td class="row-title" data-label="기준일">${formatDate(rate.date)}</td>
  <td class="num" data-label="환율">${formatMoney(rate.rate, "KRW")}</td>
  <td class="num ${pnlClass(change)}" data-label="변동">${changeText}</td>
</tr>`;
  });
  return html`<table class="responsive">
  <thead><tr><th>기준일</th><th>환율</th><th>변동</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

export function fxPage(base: string, quote: string, rates: FxRate[]): SafeHtml {
  const latest = rates[0] ?? null;
  const chronological = rates.slice().reverse();
  const data = chronological.map((rate, index) => {
    const previous = chronological[index - 1];
    const change = previous ? rate.rate - previous.rate : null;
    const pct = previous && previous.rate !== 0 ? ((rate.rate - previous.rate) / previous.rate) * 100 : null;
    return {
      date: rate.date,
      value: rate.rate,
      sub: change == null ? null : `전일 대비 ${formatSignedMoney(change, "KRW")} (${formatPercent(pct)})`,
    };
  });

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
${rates.length > 0 ? fxTable(rates) : html``}`;

  return layout({ title: `${base}/${quote} 환율 · Asset Tracker`, showNav: true, navExtra: fxLink(latest), body });
}

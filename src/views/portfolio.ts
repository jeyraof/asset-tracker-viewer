import type {
  Account,
  AccountHolding,
  AccountSummary,
  FxRate,
  Holding,
  SnapshotPoint,
  Trade,
} from "../db/portfolio";
import { formatDate, formatMoney, formatPercent, formatPercentPlain, formatQuantity, formatSignedMoney, pnlClass } from "../lib/format";
import { html, type SafeHtml } from "../lib/html";
import { aggregateHoldings, type MergedHolding } from "../lib/aggregate";
import { deposit, evalAmount, netAsset } from "../lib/amounts";
import { pnlTone, squarify } from "../lib/treemap";
import { areaPoints, linePoints, plotCoords, serializeChartPoints } from "../lib/chartData";
import { countryFlag, providerName } from "../lib/labels";
import { layout } from "./layout";

function accountTitle(account: {
  alias: string | null;
  name: string | null;
  accountNo: string | null;
  provider: string;
}): { primary: string; parenthetical: string | null } {
  const alias = account.alias?.trim();
  const name = account.name?.trim();
  const accountNo = account.accountNo?.trim();
  if (alias) return { primary: alias, parenthetical: accountNo ? accountNo : null };
  return { primary: name ? name : providerName(account.provider), parenthetical: null };
}

/** Primary label is the alias when set, with the account id shown in small text. */
function accountLabel(account: {
  alias: string | null;
  name: string | null;
  accountNo: string | null;
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
export function fxLink(fx: FxRate | null): SafeHtml {
  if (!fx) return html``;
  const date = formatDate(fx.date);
  const rate = formatMoney(fx.rate, "KRW");
  return html`<a class="nav-button nav-fx has-tip" href="/fx" data-tip="기준일 ${date}" aria-label="USD/KRW ${rate} (${date})">USD/KRW ${rate}</a>`;
}

function accountsTable(accounts: AccountSummary[], fx: FxRate | null, showTotal = false): SafeHtml {
  const rows = accounts.map(
    (account) => html`<tr>
  <td class="row-title" data-label="계좌"><a href="/accounts/${account.id}">${accountLabel(account)}</a><div class="muted"><span title="${account.provider}">${providerName(account.provider)}</span> · ${countryFlag(account.country)}</div></td>
  <td class="num" data-label="기준일">${formatDate(account.snapshotDate)}</td>
  <td class="num" data-label="순자산">${moneyCell(netAsset(account), account.currency, fx)}</td>
  <td class="num" data-label="평가금액">${moneyCell(evalAmount(account), account.currency, fx)}</td>
  <td class="num ${pnlClass(account.evalPflsAmount)}" data-label="평가손익">${moneyCell(account.evalPflsAmount, account.currency, fx, true)}</td>
  <td class="num" data-label="예수금">${moneyCell(deposit(account), account.currency, fx)}</td>
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

  return layout({ title: "계좌별 · Asset Tracker", page: "accounts", showNav: true, navExtra: fxLink(fx), body });
}

/** Human-readable list of the accounts that contribute to a merged holding. */
function mergedAccountLabel(accounts: MergedHolding["accounts"]): string {
  return accounts
    .map((account) => account.alias?.trim() || account.name?.trim() || providerName(account.provider))
    .join(", ");
}

function allSummary(summaries: AccountSummary[], fx: FxRate | null): SafeHtml {
  const canTotal = fx !== null || summaries.every((account) => account.currency === "KRW");
  if (!canTotal) {
    return html`<p class="muted">환율 정보가 없어 KRW 합계를 계산할 수 없습니다.</p>`;
  }

  const net = summaries.reduce((sum, account) => sum + krwAmount(netAsset(account), account.currency, fx), 0);
  const evaluation = summaries.reduce((sum, account) => sum + krwAmount(evalAmount(account), account.currency, fx), 0);
  const cash = summaries.reduce((sum, account) => sum + krwAmount(deposit(account), account.currency, fx), 0);

  return html`<div class="cards">
  <div class="card">
    <dl>
      <dt>순자산</dt><dd>${formatMoney(net, "KRW")}</dd>
      <dt>평가금액</dt><dd>${formatMoney(evaluation, "KRW")}</dd>
      <dt>예수금</dt><dd>${formatMoney(cash, "KRW")}</dd>
      <dt>계좌</dt><dd>${summaries.length}</dd>
    </dl>
  </div>
</div>`;
}

function allHoldingsTable(holdings: MergedHolding[], fx: FxRate | null): SafeHtml {
  if (holdings.length === 0) return html`<p class="muted">보유 종목이 없습니다.</p>`;

  const evalKrw = holdings.map((holding) => krwAmount(holding.evalAmount, holding.currency, fx));
  const total = evalKrw.reduce((sum, value) => sum + value, 0);
  const order = holdings
    .map((_, index) => index)
    .sort((a, b) => (evalKrw[b] ?? 0) - (evalKrw[a] ?? 0));
  const weights = new Map<number, number | null>(
    order.map((index) => [
      index,
      total > 0 && evalKrw[index] != null ? ((evalKrw[index] ?? 0) / total) * 100 : null,
    ]),
  );

  const composition =
    total > 0
      ? html`<div class="composition">${order.map((index) => {
          const weight = weights.get(index);
          if (weight == null || weight <= 0) return html``;
          return html`<span class="fill c${index % PALETTE_SIZE} w${Math.round(weight)}"></span>`;
        })}</div>
<ul class="legend">${order.map((index) => {
          const holding = holdings[index];
          const weight = weights.get(index);
          if (!holding || weight == null) return html``;
          return html`<li><span class="dot c${index % PALETTE_SIZE}"></span>${holding.productName ?? holding.symbol} ${formatPercentPlain(weight)}</li>`;
        })}</ul>`
      : html``;

  const rows = order.map((index) => {
    const holding = holdings[index];
    if (!holding) return html``;
    const color = index % PALETTE_SIZE;
    const weight = weights.get(index) ?? null;
    const allocation =
      weight != null && weight > 0
        ? html`<div class="alloc"><div class="bar"><span class="fill c${color} w${Math.round(weight)}"></span></div><span class="pct">${formatPercentPlain(weight)}</span></div>`
        : html``;
    return html`<tr>
  <td class="row-title" data-label="종목">${holding.productName ?? holding.symbol}<div class="muted">${holding.market} · ${holding.symbol} · ${mergedAccountLabel(holding.accounts)}</div>${allocation}</td>
  <td class="num" data-label="수량">${formatQuantity(holding.quantity)}</td>
  <td class="num" data-label="평단">${moneyCell(holding.avgPrice, holding.currency, fx)}</td>
  <td class="num" data-label="현재가">${moneyCell(holding.currentPrice, holding.currency, fx)}</td>
  <td class="num" data-label="평가금액">${moneyCell(holding.evalAmount, holding.currency, fx)}</td>
  <td class="num weight-cell" data-label="비중">${formatPercentPlain(weight)}</td>
  <td class="num ${pnlClass(holding.evalPflsAmount)}" data-label="평가손익">${moneyCell(holding.evalPflsAmount, holding.currency, fx, true)}</td>
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

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 640;

interface MapTile {
  label: string;
  name: string | null;
  meta: string;
  value: number;
  rate: number | null;
  tone: string;
}

function toneClass(rate: number | null): string {
  const tone = pnlTone(rate);
  return tone.dir === "flat" ? "tm-flat" : `tm-${tone.dir}-${tone.level}`;
}

function accountDisplayLabel(account: AccountSummary): string {
  return account.alias?.trim() || account.name?.trim() || providerName(account.provider);
}

/** Finviz-style treemap of securities (by KRW evaluation) plus cash per currency. */
function assetMap(merged: MergedHolding[], summaries: AccountSummary[], fx: FxRate | null): SafeHtml {
  const tiles: MapTile[] = [];

  for (const holding of merged) {
    if (holding.currency !== "KRW" && fx === null) continue;
    const value = krwAmount(holding.evalAmount, holding.currency, fx);
    if (value <= 0) continue;
    tiles.push({
      label: holding.symbol,
      name: holding.productName,
      meta: mergedAccountLabel(holding.accounts),
      value,
      rate: holding.evalPflsRate,
      tone: toneClass(holding.evalPflsRate),
    });
  }

  for (const currency of ["KRW", "USD"]) {
    if (currency !== "KRW" && fx === null) continue;
    const cashAccounts = summaries.filter(
      (account) => account.currency === currency && (deposit(account) ?? 0) > 0,
    );
    const cash = cashAccounts.reduce((sum, account) => sum + (deposit(account) ?? 0), 0);
    const value = krwAmount(cash, currency, fx);
    if (value <= 0) continue;
    tiles.push({
      label: `현금 ${currency}`,
      name: null,
      meta: cashAccounts.map(accountDisplayLabel).join(", "),
      value,
      rate: null,
      tone: "tm-cash",
    });
  }

  if (tiles.length === 0) return html`<p class="muted">표시할 자산이 없습니다.</p>`;

  tiles.sort((a, b) => b.value - a.value);
  const rects = squarify(tiles.map((tile) => tile.value), MAP_WIDTH, MAP_HEIGHT);

  const cells = rects.map((rect, index) => {
    const tile = tiles[index];
    if (!tile) return html``;
    const rateText = tile.rate != null ? formatPercent(tile.rate) : "";
    const valueText = formatMoney(tile.value, "KRW");
    const title = `${tile.name ?? tile.label} ${valueText}${rateText ? ` ${rateText}` : ""}${tile.meta ? ` · ${tile.meta}` : ""}`;
    const minDimension = Math.min(rect.width, rect.height);
    const codeSize = Math.max(9, Math.min(30, Math.round(minDimension * 0.22)));
    const centerX = Math.round((rect.x + rect.width / 2) * 100) / 100;
    const centerY = Math.round((rect.y + rect.height / 2) * 100) / 100;
    const showCode = rect.width >= 30 && rect.height >= 18;
    const showRate = rateText !== "" && rect.width >= 46 && rect.height >= 40;
    return html`<g class="tile ${tile.tone}" tabindex="0" data-label="${tile.name ?? tile.label}" data-value="${valueText}" data-rate="${rateText || "-"}" data-accounts="${tile.meta || "-"}">
  <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}"></rect>
  <title>${title}</title>
  ${showCode ? html`<text x="${centerX}" y="${showRate ? centerY - codeSize * 0.5 : centerY}" text-anchor="middle" dominant-baseline="middle" font-size="${codeSize}">${tile.label}</text>` : html``}
  ${showRate ? html`<text x="${centerX}" y="${centerY + codeSize * 0.6}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(8, Math.round(codeSize * 0.6))}">${rateText}</text>` : html``}
</g>`;
  });

  return html`<figure class="treemap-wrap">
  <svg class="treemap" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-label="자산 지도">
    ${cells}
  </svg>
  <div class="map-tip" hidden>
    <div class="tip-label"></div>
    <div class="tip-sub"></div>
    <div class="tip-accounts"></div>
  </div>
  <figcaption class="map-legend muted"><span class="swatch tm-down-4"></span>하락 <span class="swatch tm-flat"></span>보합 <span class="swatch tm-up-4"></span>상승</figcaption>
</figure>`;
}

export interface AllPageInput {
  summaries: AccountSummary[];
  holdings: AccountHolding[];
  fx: FxRate | null;
}

export function allPage(input: AllPageInput): SafeHtml {
  const { summaries, holdings, fx } = input;
  const merged = aggregateHoldings(holdings);

  const body = html`<h2>모아보기 <span class="muted">${merged.length} 종목 · ${summaries.length} 계좌</span></h2>
${allSummary(summaries, fx)}
<h2>보유 종목</h2>
${allHoldingsTable(merged, fx)}
<h2>자산 지도</h2>
${assetMap(merged, summaries, fx)}`;

  return layout({ title: "모아보기 · Asset Tracker", page: "all", showNav: true, navExtra: fxLink(fx), body });
}

function summaryList(account: Account, summary: AccountSummary | null, fx: FxRate | null): SafeHtml {
  const currency = account.currency;

  return html`<div class="card">
  <dl>
    <dt>기준일</dt><dd>${formatDate(account.snapshotDate)}</dd>
    <dt>(A) 매입금액</dt><dd>${moneyCell(summary?.purchaseAmountTotal, currency, fx)}</dd>
    <dt>(B) 평가손익</dt><dd class="${pnlClass(summary?.evalPflsAmount)}">${moneyCell(summary?.evalPflsAmount, currency, fx, true)}</dd>
    <dt>(C) 평가금액 <span class="muted label-sub">= (A) + (B)</span></dt><dd>${moneyCell(summary ? evalAmount(summary) : null, currency, fx)}</dd>
    <dt>(D) 예수금</dt><dd>${moneyCell(summary ? deposit(summary) : null, currency, fx)}</dd>
    <dt>(E) 순자산 <span class="muted label-sub">= (C) + (D)</span></dt><dd>${moneyCell(summary ? netAsset(summary) : null, currency, fx)}</dd>
  </dl>
</div>
<p class="muted label-sub">평가금액 = 매입금액 + 평가손익, 순자산 = 평가금액 + 예수금</p>`;
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
  <td class="num" data-label="예수금">${formatMoney(deposit(point), currency)}</td>
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
    ${data.length === 1 ? html`<span class="single-point"></span><span class="single-point-label">${options.formatValue(data[0]?.value ?? 0)}</span>` : html``}
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

const SNAPSHOT_TABLE_LIMIT = 10;

function historySection(points: SnapshotPoint[], currency: string): SafeHtml {
  if (points.length === 0) return html`<p class="muted">스냅샷 이력이 없습니다.</p>`;
  return html`${historyChart(points, currency)}
${historyTable(points.slice(0, SNAPSHOT_TABLE_LIMIT), currency)}`;
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

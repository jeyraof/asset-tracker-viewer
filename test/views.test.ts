import { describe, expect, it } from "vitest";
import { accountPage, accountsPage, fxPage } from "../src/views/portfolio";
import { loginPage, registerPage } from "../src/views/auth";
import { notFoundPage } from "../src/views/error";
import type { AccountSummary, FxRate, Holding, SnapshotPoint, Trade } from "../src/db/portfolio";

function summary(overrides: Partial<AccountSummary> & { id: number }): AccountSummary {
  return {
    provider: "kis",
    name: `account-${overrides.id}`,
    alias: null,
    accountNo: "00000000-01",
    country: "KR",
    currency: "KRW",
    snapshotDate: "2026-09-24",
    netAssetAmount: 0,
    evalPflsAmount: 0,
    depositTotal: 0,
    purchaseAmountTotal: 0,
    securitiesEvalAmount: overrides.securitiesEvalAmount ?? overrides.netAssetAmount ?? 0,
    holdingCount: 0,
    ...overrides,
  };
}

const fx = { base: "USD", quote: "KRW", date: "2026-09-24", rate: 1300 };

function holding(overrides: Partial<Holding> = {}): Holding {
  return {
    market: "KRX",
    symbol: "005930",
    productName: "삼성전자",
    currency: "KRW",
    quantity: 10,
    avgPrice: 70000,
    purchaseAmount: 700000,
    currentPrice: 75000,
    evalAmount: 750000,
    evalPflsAmount: 50000,
    evalPflsRate: 7.14,
    ...overrides,
  };
}

function point(overrides: Partial<SnapshotPoint> & { date: string }): SnapshotPoint {
  return {
    netAssetAmount: null,
    evalPflsAmount: null,
    depositTotal: null,
    securitiesEvalAmount: overrides.securitiesEvalAmount ?? overrides.netAssetAmount ?? null,
    ...overrides,
  };
}

function trade(overrides: Partial<Trade> = {}): Trade {
  return {
    date: "2026-09-24",
    market: "KRX",
    symbol: "005930",
    productName: "삼성전자",
    side: "BUY",
    quantity: 10,
    avgPrice: 70000,
    amount: 700000,
    currency: "KRW",
    orderTime: "09:01:00",
    ...overrides,
  };
}

function detail(
  overrides: {
    history?: SnapshotPoint[];
    holdings?: Holding[];
    trades?: Trade[];
    alias?: string | null;
    fx?: FxRate | null;
  } = {},
) {
  return {
    account: {
      id: 3,
      provider: "kis",
      name: "Main",
      alias: overrides.alias ?? null,
      accountNo: "00000000-01",
      country: "KR",
      currency: "KRW",
      snapshotDate: "2026-09-24",
    },
    summary: null,
    holdings: overrides.holdings ?? [],
    history: overrides.history ?? [],
    trades: overrides.trades ?? [],
    fx: overrides.fx ?? null,
  };
}

function parseDataPoints(page: string): unknown[][] {
  const match = /data-points="([^"]*)"/.exec(page);
  if (!match || match[1] === undefined) throw new Error("data-points attribute not found");
  const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  return JSON.parse(decoded) as unknown[][];
}

describe("history section", () => {
  it("renders a net-asset chart with the table expanded", () => {
    const page = accountPage(
      detail({
        history: [
          point({ date: "2026-09-24", netAssetAmount: 200 }),
          point({ date: "2026-09-23", netAssetAmount: 100 }),
          point({ date: "2026-09-22", netAssetAmount: 150 }),
        ],
      }),
    ).value;

    expect(page).toContain('<svg class="spark"');
    expect(page).toContain('<polyline class="line"');
    expect(page).toContain('<polygon class="area"');
    expect(page).toContain("최고");
    expect(page).toContain("최저");
    expect(page).not.toContain("<details>");
    expect(page).not.toContain("표로 보기");
    expect(page).not.toContain("NaN");

    const chartStart = page.indexOf('<figure class="chart"');
    const tableStart = page.indexOf('<table class="responsive">', chartStart);
    const chart = page.slice(chartStart, tableStart);
    expect(chart.indexOf("2026-09-22")).toBeGreaterThan(-1);
    expect(chart.indexOf("2026-09-22")).toBeLessThan(chart.indexOf("2026-09-24"));
  });

  it("limits the history table to the latest 10 points but keeps the chart full", () => {
    const history = Array.from({ length: 12 }, (_, index) =>
      point({ date: `2026-09-${String(12 - index).padStart(2, "0")}`, netAssetAmount: 100 + index }),
    );
    const page = accountPage(detail({ history })).value;

    expect(parseDataPoints(page)).toHaveLength(12);
    expect((page.match(/data-label="기준일"/g) ?? []).length).toBe(10);
  });

  it("embeds interactive chart points and controls", () => {
    const page = accountPage(
      detail({
        history: [
          point({ date: "2026-09-24", netAssetAmount: 200, evalPflsAmount: 20 }),
          point({ date: "2026-09-23", netAssetAmount: 100, evalPflsAmount: 10 }),
        ],
      }),
    ).value;

    expect(page).toContain("평균");
    expect(page).toContain('<div class="chart-plot" tabindex="0"');
    expect(page).toContain('class="cursor" hidden');
    expect(page).toContain('class="chart-tip" hidden');
    expect(page).toContain('class="chart-hint" hidden');
    expect(page).toContain('class="visually-hidden"');

    const points = parseDataPoints(page);
    expect(points).toHaveLength(2);
    expect(points[0]?.[2]).toBe("2026-09-23");
    expect(points[1]?.[2]).toBe("2026-09-24");
    expect(String(points[1]?.[3])).toContain("200");
    expect(String(points[1]?.[4])).toContain("평가손익");
  });

  it("handles a single snapshot without producing NaN", () => {
    const page = accountPage(detail({ history: [point({ date: "2026-09-24", netAssetAmount: 100 })] })).value;
    expect(page).toContain('<polyline class="line"');
    expect(page).not.toContain("NaN");
    expect(page).toContain('class="single-point"');
    expect(page).toContain('class="single-point-label"');
    expect(page).toContain("₩100");
  });

  it("omits the single-point marker for multi-point charts", () => {
    const page = accountPage(
      detail({
        history: [
          point({ date: "2026-09-24", netAssetAmount: 200 }),
          point({ date: "2026-09-23", netAssetAmount: 100 }),
        ],
      }),
    ).value;
    expect(page).not.toContain("single-point");
  });

  it("shows a message when there is no history", () => {
    const page = accountPage(detail({ history: [] })).value;
    expect(page).toContain("스냅샷 이력이 없습니다.");
    expect(page).not.toContain('<svg class="spark"');
  });

  it("falls back to the table when no net asset values exist", () => {
    const page = accountPage(detail({ history: [point({ date: "2026-09-24", netAssetAmount: null })] })).value;
    expect(page).not.toContain('<svg class="spark"');
    expect(page).not.toContain("표로 보기");
    expect(page).toContain("스냅샷 이력");
  });
});

describe("accountsPage", () => {
  it("renders account rows as real table markup", () => {
    const page = accountsPage(
      [
        summary({
          id: 3,
          name: "KIS 10092224-22",
          netAssetAmount: 2585985,
          evalPflsAmount: 26356,
          purchaseAmountTotal: 25599146,
          securitiesEvalAmount: 25572790,
          holdingCount: 7,
        }),
      ],
      fx,
    ).value;

    expect(page).toContain('<td class="row-title" data-label="계좌"><a href="/accounts/3">KIS 10092224-22</a>');
    expect(page).toContain('<span title="kis">한국투자증권</span> · 🇰🇷');
    expect(page).not.toContain("&lt;td");
    expect(page).toContain("USD/KRW");
  });

  it("escapes untrusted account names", () => {
    const page = accountsPage([summary({ id: 1, name: '<script>alert("x")</script>' })], null).value;
    expect(page).not.toContain("<script>");
    expect(page).toContain("&lt;script&gt;");
  });

  it("shows investing accounts and the rest under 기타 계좌", () => {
    const page = accountsPage(
      [
        summary({ id: 1, netAssetAmount: 0 }),
        summary({ id: 2, netAssetAmount: 5000 }),
        summary({ id: 3, netAssetAmount: 5000, holdingCount: 2 }),
      ],
      null,
    ).value;

    expect(page).toContain("투자 중");
    expect(page).toContain("기타 계좌");
    expect(page).not.toContain("잔고 계좌");
    expect(page).not.toContain("빈 계좌");
    expect(page).not.toContain("<details>");

    const other = page.slice(page.indexOf("기타 계좌"));
    expect(other).toContain('href="/accounts/1"');
    expect(other).toContain('href="/accounts/2"');
    expect(other).not.toContain('href="/accounts/3"');
  });

  it("totals investing net asset, eval, and pnl in krw", () => {
    const page = accountsPage(
      [
        summary({ id: 3, name: "KRW", currency: "KRW", securitiesEvalAmount: 1000, depositTotal: 200, evalPflsAmount: 100, holdingCount: 1 }),
        summary({ id: 4, name: "USD", currency: "USD", securitiesEvalAmount: 2, depositTotal: 0, evalPflsAmount: 1, holdingCount: 1 }),
      ],
      fx,
    ).value;

    // net = (1000+200) + 2*1300 = 3800 ; eval = 1000 + 2*1300 = 3600 ; pnl = 100 + 1*1300 = 1400
    expect(page).toContain("<tfoot>");
    expect(page).toContain("₩3,800");
    expect(page).toContain("₩3,600");
    expect(page).toContain("+₩1,400");
  });

  it("omits the total when mixed currencies cannot be converted", () => {
    const page = accountsPage(
      [
        summary({ id: 3, currency: "KRW", netAssetAmount: 1000, holdingCount: 1 }),
        summary({ id: 4, currency: "USD", netAssetAmount: 2, holdingCount: 1 }),
      ],
      null,
    ).value;

    expect(page).not.toContain("<tfoot>");
  });

  it("shows net asset as eval plus deposit, and eval without cash", () => {
    const page = accountsPage(
      [summary({ id: 3, securitiesEvalAmount: 1000, depositTotal: 200, netAssetAmount: 999999, holdingCount: 1 })],
      null,
    ).value;

    expect(page).toContain("₩1,200");
    expect(page).toContain("₩1,000");
    expect(page).toContain("₩200");
  });

  it("sorts investing accounts by net asset (fx converted)", () => {
    const page = accountsPage(
      [
        summary({ id: 10, name: "KRW account", currency: "KRW", netAssetAmount: 1_000_000, holdingCount: 1 }),
        summary({ id: 11, name: "USD account", currency: "USD", netAssetAmount: 1000, holdingCount: 1 }),
      ],
      fx,
    ).value;

    expect(page.indexOf("USD account")).toBeLessThan(page.indexOf("KRW account"));
  });

  it("renders account detail tables with responsive labels", () => {
    const page = accountPage({
      account: { id: 3, provider: "kis", name: "Main", alias: null, accountNo: "00000000-01", country: "KR", currency: "KRW", snapshotDate: "2026-09-24" },
      summary: null,
      holdings: [holding({ evalAmount: 750000 })],
      history: [{ date: "2026-09-24", securitiesEvalAmount: 750000, netAssetAmount: 760000, evalPflsAmount: 50000, depositTotal: 10000 }],
      trades: [],
      fx: null,
    }).value;

    expect(page).toContain("삼성전자");
    expect(page).toContain('<table class="responsive">');
    expect(page).toContain('data-label="평가금액"');
    expect(page).not.toContain("&lt;tr");
    expect(page).not.toContain("<h3>");
  });

  it("renders a composition bar and per-holding allocation for weights", () => {
    const page = accountPage({
      account: { id: 3, provider: "kis", name: "Main", alias: null, accountNo: "00000000-01", country: "KR", currency: "KRW", snapshotDate: "2026-09-24" },
      summary: null,
      holdings: [
        holding({ symbol: "005930", productName: "삼성전자", evalAmount: 750000 }),
        holding({ symbol: "000660", productName: "SK하이닉스", evalAmount: 250000 }),
      ],
      history: [],
      trades: [],
      fx: null,
    }).value;

    expect(page).toContain('<div class="composition">');
    expect(page).toContain('class="fill c0 w75"');
    expect(page).toContain('class="fill c1 w25"');
    expect(page).toContain('class="dot c0"');
    expect(page).toContain('class="dot c1"');
    expect(page).toContain('<div class="alloc">');
    expect(page).toContain('class="pct">75%');
  });

  it("omits allocation visuals when there is no evaluated total", () => {
    const page = accountPage({
      account: { id: 3, provider: "kis", name: "Main", alias: null, accountNo: "00000000-01", country: "KR", currency: "KRW", snapshotDate: "2026-09-24" },
      summary: null,
      holdings: [holding({ evalAmount: null })],
      history: [],
      trades: [],
      fx: null,
    }).value;

    expect(page).not.toContain('class="composition"');
    expect(page).not.toContain('class="alloc"');
  });

  it("prefers the alias and shows the account id in small text", () => {
    const page = accountsPage([summary({ id: 3, alias: "퇴직연금", name: "KIS 10092224-22" })], null).value;
    expect(page).toContain('퇴직연금 <span class="muted label-sub">(00000000-01)</span>');
  });

  it("shows the name when there is no alias", () => {
    const page = accountsPage([summary({ id: 3, alias: null, name: "KIS 10092224-22" })], null).value;
    expect(page).toContain('<a href="/accounts/3">KIS 10092224-22</a>');
    expect(page).not.toContain("label-sub");
  });

  it("uses the alias in the account detail heading and title", () => {
    const page = accountPage(detail({ alias: "퇴직연금" })).value;
    expect(page).toContain('퇴직연금 <span class="muted label-sub">(00000000-01)</span>');
    expect(page).toContain("<title>퇴직연금 · Asset Tracker</title>");
  });

  it("renders trades as a scrollable table, not cards", () => {
    const page = accountPage(
      detail({
        trades: [
          trade(),
          trade({ symbol: "000660", productName: "SK하이닉스", side: "SELL" }),
        ],
      }),
    ).value;

    expect(page).toContain('<div class="table-scroll">');
    const trades = page.slice(page.indexOf("최근 거래"));
    expect(trades).toContain("<table>");
    expect(trades).not.toContain('<table class="responsive">');
  });

  it("links fx in the header and drops the passkey note", () => {
    const page = accountsPage([summary({ id: 3, netAssetAmount: 100 })], fx).value;
    expect(page).toContain('<div class="nav-actions">');
    expect(page).toContain('<a class="nav-button nav-fx" href="/fx">USD/KRW');
    expect(page).not.toContain('<p class="muted"><a href="/fx">');
    expect(page).not.toContain("passkey로 보호된");
  });

  it("shows the fx link in the header on the account detail page", () => {
    const page = accountPage(detail({ fx })).value;
    expect(page).toContain('<a class="nav-button nav-fx" href="/fx">USD/KRW');
  });

  it("renders the fx history page with a chart and an expanded table", () => {
    const rates: FxRate[] = [
      { base: "USD", quote: "KRW", date: "2026-09-24", rate: 1299 },
      { base: "USD", quote: "KRW", date: "2026-09-23", rate: 1280 },
    ];
    const page = fxPage("USD", "KRW", rates).value;

    expect(page).toContain("USD/KRW");
    expect(page).toContain('<svg class="spark"');
    expect(page).not.toContain("<details>");
    expect(page).not.toContain("표로 보기");
    expect(page).not.toContain("NaN");
    expect(page).toContain("+₩19 (+1.48%)");
    expect(page).toContain("평균");

    const points = parseDataPoints(page);
    expect(points).toHaveLength(2);
    expect(String(points[1]?.[4])).toContain("전일 대비");
  });

  it("shows no change for the oldest fx row", () => {
    const page = fxPage("USD", "KRW", [{ base: "USD", quote: "KRW", date: "2026-09-24", rate: 1299 }]).value;
    expect(page).toContain('data-label="변동">-</td>');
  });

  it("shows a message when there is no fx history", () => {
    const page = fxPage("USD", "KRW", []).value;
    expect(page).toContain("환율 이력이 없습니다.");
    expect(page).not.toContain('<svg class="spark"');
  });

  it("shows usd amounts converted to krw with the original below", () => {
    const page = accountsPage(
      [
        summary({
          id: 27,
          name: "Kiwoom US",
          currency: "USD",
          netAssetAmount: 1000,
          evalPflsAmount: 50,
          depositTotal: null,
          holdingCount: 1,
        }),
      ],
      fx,
    ).value;

    expect(page).toContain("₩1,300,000");
    expect(page).toContain("US$1,000.00");
    expect(page).toContain("+₩65,000");
    expect(page).toContain("+US$50.00");
  });

  it("keeps the original currency when there is no fx rate", () => {
    const page = accountsPage(
      [summary({ id: 27, currency: "USD", netAssetAmount: 1000, holdingCount: 1 })],
      null,
    ).value;

    expect(page).toContain("US$1,000.00");
    expect(page).not.toContain("₩1,300,000");
  });

  it("converts summary card amounts inline without a separate won row", () => {
    const page = accountPage({
      account: {
        id: 27,
        provider: "kiwoom",
        name: "US",
        alias: null,
        accountNo: "00000000-01",
        country: "US",
        currency: "USD",
        snapshotDate: "2026-09-23",
      },
      summary: summary({ id: 27, currency: "USD", netAssetAmount: 1000 }),
      holdings: [],
      history: [],
      trades: [],
      fx,
    }).value;

    expect(page).toContain("₩1,300,000");
    expect(page).toContain("US$1,000.00");
    expect(page).not.toContain("평가금액(원화)");
  });

  it("renders auth and error pages", () => {
    expect(loginPage().value).toContain('id="login-button"');
    expect(registerPage({ setupTokenRequired: true }).value).toContain('id="setup-token"');
    expect(registerPage({ setupTokenRequired: false }).value).not.toContain('id="setup-token"');
    expect(notFoundPage().value).toContain("404");
  });
});

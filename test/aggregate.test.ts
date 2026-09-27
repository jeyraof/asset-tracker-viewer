import { describe, expect, it } from "vitest";
import { aggregateHoldings, type HoldingPosition } from "../src/lib/aggregate";

function position(overrides: Partial<HoldingPosition>): HoldingPosition {
  return {
    accountId: 1,
    provider: "kis",
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

describe("aggregateHoldings", () => {
  it("merges the same instrument across accounts", () => {
    const merged = aggregateHoldings([
      position({ accountId: 1, quantity: 10, purchaseAmount: 700000, evalAmount: 750000, evalPflsAmount: 50000 }),
      position({ accountId: 2, provider: "kiwoom", quantity: 5, purchaseAmount: 400000, evalAmount: 420000, evalPflsAmount: 20000 }),
    ]);

    expect(merged).toHaveLength(1);
    const holding = merged[0];
    expect(holding?.quantity).toBe(15);
    expect(holding?.purchaseAmount).toBe(1_100_000);
    expect(holding?.evalAmount).toBe(1_170_000);
    expect(holding?.evalPflsAmount).toBe(70_000);
    expect(holding?.avgPrice).toBeCloseTo(1_100_000 / 15);
    expect(holding?.evalPflsRate).toBeCloseTo((70_000 / 1_100_000) * 100);
    expect(holding?.accounts).toEqual([
      { id: 1, provider: "kis", name: null, alias: null, accountNo: null },
      { id: 2, provider: "kiwoom", name: null, alias: null, accountNo: null },
    ]);
  });

  it("keeps different instruments as separate rows", () => {
    const merged = aggregateHoldings([
      position({ symbol: "005930" }),
      position({ symbol: "000660", productName: "SK하이닉스" }),
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.map((holding) => holding.symbol).sort()).toEqual(["000660", "005930"]);
  });

  it("treats missing parts as zero but stays null when every part is missing", () => {
    const merged = aggregateHoldings([
      position({ accountId: 1, evalAmount: 100, purchaseAmount: null, quantity: null, evalPflsAmount: null }),
      position({ accountId: 2, evalAmount: 50, purchaseAmount: null, quantity: null, evalPflsAmount: null }),
    ]);
    const holding = merged[0];
    expect(holding?.evalAmount).toBe(150);
    expect(holding?.purchaseAmount).toBeNull();
    expect(holding?.quantity).toBeNull();
    expect(holding?.avgPrice).toBeNull();
    expect(holding?.evalPflsRate).toBeNull();
  });

  it("does not repeat an account that appears twice", () => {
    const merged = aggregateHoldings([position({ accountId: 1 }), position({ accountId: 1, symbol: "005930" })]);
    expect(merged[0]?.accounts).toEqual([{ id: 1, provider: "kis", name: null, alias: null, accountNo: null }]);
  });

  it("sorts merged rows by evaluation amount descending", () => {
    const merged = aggregateHoldings([
      position({ symbol: "AAA", evalAmount: 100 }),
      position({ symbol: "BBB", evalAmount: 300 }),
      position({ symbol: "CCC", evalAmount: 200 }),
    ]);
    expect(merged.map((holding) => holding.symbol)).toEqual(["BBB", "CCC", "AAA"]);
  });

  it("returns an empty list for no positions", () => {
    expect(aggregateHoldings([])).toEqual([]);
  });
});

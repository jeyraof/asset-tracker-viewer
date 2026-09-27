/** A single account's position, the unit that gets merged across accounts. */
export interface HoldingAccount {
  id: number;
  provider: string;
  name: string | null;
  alias: string | null;
  accountNo: string | null;
}

export interface HoldingPosition {
  accountId: number;
  provider: string;
  accountName?: string | null;
  accountAlias?: string | null;
  accountNo?: string | null;
  market: string;
  symbol: string;
  productName: string | null;
  currency: string;
  quantity: number | null;
  avgPrice: number | null;
  purchaseAmount: number | null;
  currentPrice: number | null;
  evalAmount: number | null;
  evalPflsAmount: number | null;
  evalPflsRate: number | null;
}

export interface MergedHolding {
  market: string;
  symbol: string;
  productName: string | null;
  currency: string;
  quantity: number | null;
  avgPrice: number | null;
  currentPrice: number | null;
  purchaseAmount: number | null;
  evalAmount: number | null;
  evalPflsAmount: number | null;
  evalPflsRate: number | null;
  accounts: HoldingAccount[];
}

function addNullable(current: number | null, value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return current;
  return (current ?? 0) + value;
}

interface Group {
  market: string;
  symbol: string;
  productName: string | null;
  currency: string | null;
  quantity: number | null;
  purchaseAmount: number | null;
  evalAmount: number | null;
  evalPflsAmount: number | null;
  currentPrice: number | null;
  accounts: HoldingAccount[];
  seenAccounts: Set<number>;
}

/**
 * Merges the same instrument (market + symbol) held in several accounts into a
 * single row: quantities and amounts are summed, average price becomes the
 * purchase-weighted price, and the contributing accounts are collected.
 */
export function aggregateHoldings(rows: readonly HoldingPosition[]): MergedHolding[] {
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const key = `${row.market}\u0000${row.symbol}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        market: row.market,
        symbol: row.symbol,
        productName: null,
        currency: null,
        quantity: null,
        purchaseAmount: null,
        evalAmount: null,
        evalPflsAmount: null,
        currentPrice: null,
        accounts: [],
        seenAccounts: new Set(),
      };
      groups.set(key, group);
    }

    if (group.productName == null) group.productName = row.productName;
    if (group.currency == null) group.currency = row.currency;
    group.quantity = addNullable(group.quantity, row.quantity);
    group.purchaseAmount = addNullable(group.purchaseAmount, row.purchaseAmount);
    group.evalAmount = addNullable(group.evalAmount, row.evalAmount);
    group.evalPflsAmount = addNullable(group.evalPflsAmount, row.evalPflsAmount);
    if (group.currentPrice == null) group.currentPrice = row.currentPrice;

    if (!group.seenAccounts.has(row.accountId)) {
      group.seenAccounts.add(row.accountId);
      group.accounts.push({
        id: row.accountId,
        provider: row.provider,
        name: row.accountName ?? null,
        alias: row.accountAlias ?? null,
        accountNo: row.accountNo ?? null,
      });
    }
  }

  const merged = Array.from(groups.values(), (group) => ({
    market: group.market,
    symbol: group.symbol,
    productName: group.productName,
    currency: group.currency ?? "KRW",
    quantity: group.quantity,
    avgPrice: group.purchaseAmount != null && group.quantity ? group.purchaseAmount / group.quantity : null,
    currentPrice: group.currentPrice,
    purchaseAmount: group.purchaseAmount,
    evalAmount: group.evalAmount,
    evalPflsAmount: group.evalPflsAmount,
    evalPflsRate:
      group.evalPflsAmount != null && group.purchaseAmount
        ? (group.evalPflsAmount / group.purchaseAmount) * 100
        : null,
    accounts: group.accounts,
  }));

  return merged.sort(
    (a, b) => (b.evalAmount ?? 0) - (a.evalAmount ?? 0) || a.symbol.localeCompare(b.symbol),
  );
}

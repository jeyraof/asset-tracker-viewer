export interface AccountSummary {
  id: number;
  provider: string;
  name: string | null;
  alias: string | null;
  externalId: string;
  country: string;
  currency: string;
  snapshotDate: string | null;
  totalEvalAmount: number | null;
  netAssetAmount: number | null;
  evalPflsAmount: number | null;
  depositTotal: number | null;
  purchaseAmountTotal: number | null;
  securitiesEvalAmount: number | null;
  /** Number of holdings in the account's latest snapshot. */
  holdingCount: number;
}

interface AccountSummaryRow {
  id: number;
  provider: string;
  name: string | null;
  alias: string | null;
  external_id: string;
  country: string;
  currency: string;
  snapshot_date: string | null;
  total_eval_amount: number | null;
  net_asset_amount: number | null;
  eval_pfls_amount: number | null;
  deposit_total: number | null;
  purchase_amount_total: number | null;
  securities_eval_amount: number | null;
  holding_count: number;
}

export interface Account {
  id: number;
  provider: string;
  name: string | null;
  alias: string | null;
  externalId: string;
  country: string;
  currency: string;
  snapshotDate: string | null;
}

export interface Holding {
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

interface HoldingRow {
  market: string;
  symbol: string;
  product_name: string | null;
  currency: string;
  quantity: number | null;
  avg_price: number | null;
  purchase_amount: number | null;
  current_price: number | null;
  eval_amount: number | null;
  eval_pfls_amount: number | null;
  eval_pfls_rate: number | null;
}

export interface SnapshotPoint {
  date: string;
  totalEvalAmount: number | null;
  netAssetAmount: number | null;
  evalPflsAmount: number | null;
  depositTotal: number | null;
}

interface SnapshotRow {
  snapshot_date: string;
  total_eval_amount: number | null;
  net_asset_amount: number | null;
  eval_pfls_amount: number | null;
  deposit_total: number | null;
}

export interface Trade {
  date: string;
  market: string;
  symbol: string;
  productName: string | null;
  side: string;
  quantity: number | null;
  avgPrice: number | null;
  amount: number | null;
  currency: string;
  orderTime: string | null;
}

interface TradeRow {
  trade_date: string;
  market: string;
  symbol: string;
  product_name: string | null;
  side: string;
  quantity: number | null;
  avg_price: number | null;
  amount: number | null;
  currency: string;
  order_time: string | null;
}

export interface FxRate {
  base: string;
  quote: string;
  date: string;
  rate: number;
}

function mapSummaryRow(row: AccountSummaryRow): AccountSummary {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    alias: row.alias,
    externalId: row.external_id,
    country: row.country,
    currency: row.currency,
    snapshotDate: row.snapshot_date,
    totalEvalAmount: row.total_eval_amount,
    netAssetAmount: row.net_asset_amount,
    evalPflsAmount: row.eval_pfls_amount,
    depositTotal: row.deposit_total,
    purchaseAmountTotal: row.purchase_amount_total,
    securitiesEvalAmount: row.securities_eval_amount,
    holdingCount: row.holding_count,
  };
}

const SUMMARY_SELECT = `SELECT a.id, a.provider, a.name, a.alias, a.external_id, a.country, a.currency,
         s.snapshot_date, s.total_eval_amount, s.net_asset_amount,
         s.eval_pfls_amount, s.deposit_total, s.purchase_amount_total,
         s.securities_eval_amount,
         (SELECT COUNT(*) FROM holdings h
           WHERE h.account_id = a.id
             AND h.snapshot_date = (SELECT MAX(snapshot_date) FROM holdings WHERE account_id = a.id)) AS holding_count
    FROM accounts a
    LEFT JOIN account_snapshots s
      ON s.id = (SELECT id FROM account_snapshots
                  WHERE account_id = a.id
                  ORDER BY snapshot_date DESC LIMIT 1)
   WHERE a.active = 1`;

export function listAccountSummaries(db: D1Database): Promise<AccountSummary[]> {
  return db
    .prepare(`${SUMMARY_SELECT} ORDER BY a.id`)
    .all<AccountSummaryRow>()
    .then(({ results }) => (results ?? []).map(mapSummaryRow));
}

export async function getAccountSummary(db: D1Database, id: number): Promise<AccountSummary | null> {
  const row = await db
    .prepare(`${SUMMARY_SELECT} AND a.id = ?`)
    .bind(id)
    .first<AccountSummaryRow>();
  return row ? mapSummaryRow(row) : null;
}

export async function getAccount(db: D1Database, id: number): Promise<Account | null> {
  const account = await db
    .prepare("SELECT id, provider, name, alias, external_id, country, currency FROM accounts WHERE id = ? AND active = 1")
    .bind(id)
    .first<{ id: number; provider: string; name: string | null; alias: string | null; external_id: string; country: string; currency: string }>();
  if (!account) return null;

  const row = await db
    .prepare(
      `SELECT snapshot_date FROM holdings
        WHERE account_id = ?
        ORDER BY snapshot_date DESC LIMIT 1`,
    )
    .bind(id)
    .first<{ snapshot_date: string }>();

  return {
    id: account.id,
    provider: account.provider,
    name: account.name,
    alias: account.alias,
    externalId: account.external_id,
    country: account.country,
    currency: account.currency,
    snapshotDate: row?.snapshot_date ?? null,
  };
}

export function listLatestHoldings(db: D1Database, accountId: number): Promise<Holding[]> {
  return db
    .prepare(
      `SELECT market, symbol, product_name, currency, quantity, avg_price,
              purchase_amount, current_price, eval_amount, eval_pfls_amount, eval_pfls_rate
         FROM holdings
        WHERE account_id = ?
          AND snapshot_date = (SELECT MAX(snapshot_date) FROM holdings WHERE account_id = ?)
        ORDER BY COALESCE(eval_amount, 0) DESC`,
    )
    .bind(accountId, accountId)
    .all<HoldingRow>()
    .then(({ results }) =>
      (results ?? []).map((row) => ({
        market: row.market,
        symbol: row.symbol,
        productName: row.product_name,
        currency: row.currency,
        quantity: row.quantity,
        avgPrice: row.avg_price,
        purchaseAmount: row.purchase_amount,
        currentPrice: row.current_price,
        evalAmount: row.eval_amount,
        evalPflsAmount: row.eval_pfls_amount,
        evalPflsRate: row.eval_pfls_rate,
      })),
    );
}

export function listSnapshotHistory(
  db: D1Database,
  accountId: number,
  limit = 60,
): Promise<SnapshotPoint[]> {
  return db
    .prepare(
      `SELECT snapshot_date, total_eval_amount, net_asset_amount, eval_pfls_amount, deposit_total
         FROM account_snapshots
        WHERE account_id = ?
        ORDER BY snapshot_date DESC
        LIMIT ?`,
    )
    .bind(accountId, limit)
    .all<SnapshotRow>()
    .then(({ results }) =>
      (results ?? []).map((row) => ({
        date: row.snapshot_date,
        totalEvalAmount: row.total_eval_amount,
        netAssetAmount: row.net_asset_amount,
        evalPflsAmount: row.eval_pfls_amount,
        depositTotal: row.deposit_total,
      })),
    );
}

export function listRecentTrades(db: D1Database, accountId: number, limit = 30): Promise<Trade[]> {
  return db
    .prepare(
      `SELECT trade_date, market, symbol, product_name, side, quantity,
              avg_price, amount, currency, order_time
         FROM trades
        WHERE account_id = ?
        ORDER BY trade_date DESC, order_time DESC
        LIMIT ?`,
    )
    .bind(accountId, limit)
    .all<TradeRow>()
    .then(({ results }) =>
      (results ?? []).map((row) => ({
        date: row.trade_date,
        market: row.market,
        symbol: row.symbol,
        productName: row.product_name,
        side: row.side,
        quantity: row.quantity,
        avgPrice: row.avg_price,
        amount: row.amount,
        currency: row.currency,
        orderTime: row.order_time,
      })),
    );
}

export async function getLatestFxRate(
  db: D1Database,
  base: string,
  quote: string,
): Promise<FxRate | null> {
  const row = await db
    .prepare(
      `SELECT base_currency, quote_currency, date, rate
         FROM fx_rates
        WHERE base_currency = ? AND quote_currency = ?
        ORDER BY date DESC LIMIT 1`,
    )
    .bind(base, quote)
    .first<{ base_currency: string; quote_currency: string; date: string; rate: number }>();
  if (!row) return null;
  return { base: row.base_currency, quote: row.quote_currency, date: row.date, rate: row.rate };
}

export function listFxRates(
  db: D1Database,
  base: string,
  quote: string,
  limit = 365,
): Promise<FxRate[]> {
  return db
    .prepare(
      `SELECT base_currency, quote_currency, date, rate
         FROM fx_rates
        WHERE base_currency = ? AND quote_currency = ?
        ORDER BY date DESC
        LIMIT ?`,
    )
    .bind(base, quote, limit)
    .all<{ base_currency: string; quote_currency: string; date: string; rate: number }>()
    .then(({ results }) =>
      (results ?? []).map((row) => ({
        base: row.base_currency,
        quote: row.quote_currency,
        date: row.date,
        rate: row.rate,
      })),
    );
}

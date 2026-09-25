interface SyncRunRow {
  run_id: string;
  provider: string | null;
  source: string;
  task: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  details_json: string | null;
}

export interface RunCounts {
  accounts: number;
  holdings: number;
  trades: number;
  instruments: number;
  quotes: number;
  rates: number;
}

export interface SyncRun {
  runId: string;
  provider: string | null;
  source: string;
  task: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorCount: number;
  /** Providers actually involved (derived from details for all-account runs). */
  providers: string[];
  counts: RunCounts;
}

interface ParsedDetails {
  durationMs: number | null;
  errorCount: number;
  providers: string[];
  counts: RunCounts;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null);
}

function numOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function strOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Extracts duration, errors, providers, and per-task counts from a run's details JSON. */
export function parseRunDetails(json: string | null): ParsedDetails {
  const empty: ParsedDetails = {
    durationMs: null,
    errorCount: 0,
    providers: [],
    counts: { accounts: 0, holdings: 0, trades: 0, instruments: 0, quotes: 0, rates: 0 },
  };
  if (!json) return empty;

  let parsed: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(json);
    const record = asRecord(value);
    if (!record) return empty;
    parsed = record;
  } catch {
    return empty;
  }

  const accounts = asArray(parsed.accounts);
  const quotes = asArray(parsed.quotes);
  const rates = asArray(parsed.rates);

  const providers = new Set<string>();
  for (const entry of [...accounts, ...quotes]) {
    const provider = strOf(entry.provider);
    if (provider) providers.add(provider);
  }

  const sum = (entries: Record<string, unknown>[], key: string) =>
    entries.reduce((total, entry) => total + numOf(entry[key]), 0);

  return {
    durationMs: typeof parsed.durationMs === "number" ? parsed.durationMs : null,
    errorCount: Array.isArray(parsed.errors) ? parsed.errors.length : 0,
    providers: [...providers],
    counts: {
      accounts: accounts.length,
      holdings: sum(accounts, "holdings"),
      trades: sum(accounts, "trades"),
      instruments: sum(quotes, "instruments"),
      quotes: sum(quotes, "quotes"),
      rates: rates.length,
    },
  };
}

export function listSyncRuns(db: D1Database, limit = 25): Promise<SyncRun[]> {
  return db
    .prepare(
      `SELECT run_id, provider, source, task, status, started_at, finished_at, details_json
         FROM sync_runs ORDER BY id DESC LIMIT ?`,
    )
    .bind(limit)
    .all<SyncRunRow>()
    .then(({ results }) =>
      (results ?? []).map((row) => {
        const details = parseRunDetails(row.details_json);
        return {
          runId: row.run_id,
          provider: row.provider,
          source: row.source,
          task: row.task,
          status: row.status,
          startedAt: row.started_at,
          finishedAt: row.finished_at,
          durationMs: details.durationMs,
          errorCount: details.errorCount,
          providers: details.providers,
          counts: details.counts,
        };
      }),
    );
}

interface SyncErrorRow {
  provider: string | null;
  market: string | null;
  symbol: string | null;
  scope: string;
  code: string | null;
  message: string;
  created_at: string;
}

export interface SyncError {
  provider: string | null;
  market: string | null;
  symbol: string | null;
  scope: string;
  code: string | null;
  message: string;
  createdAt: string;
}

export function listSyncErrors(db: D1Database, limit = 25): Promise<SyncError[]> {
  return db
    .prepare(
      `SELECT provider, market, symbol, scope, code, message, created_at
         FROM sync_errors ORDER BY id DESC LIMIT ?`,
    )
    .bind(limit)
    .all<SyncErrorRow>()
    .then(({ results }) =>
      (results ?? []).map((row) => ({
        provider: row.provider,
        market: row.market,
        symbol: row.symbol,
        scope: row.scope,
        code: row.code,
        message: row.message,
        createdAt: row.created_at,
      })),
    );
}

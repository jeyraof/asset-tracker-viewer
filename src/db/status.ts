interface SyncRunRow {
  run_id: string;
  provider: string | null;
  source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  details_json: string | null;
}

export interface SyncRun {
  runId: string;
  provider: string | null;
  source: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorCount: number;
}

/** Pulls duration and error count out of a run's free-form details JSON. */
export function parseRunDetails(json: string | null): { durationMs: number | null; errorCount: number } {
  if (!json) return { durationMs: null, errorCount: 0 };
  try {
    const parsed = JSON.parse(json) as { durationMs?: unknown; errors?: unknown };
    const durationMs = typeof parsed.durationMs === "number" ? parsed.durationMs : null;
    const errorCount = Array.isArray(parsed.errors) ? parsed.errors.length : 0;
    return { durationMs, errorCount };
  } catch {
    return { durationMs: null, errorCount: 0 };
  }
}

export function listSyncRuns(db: D1Database, limit = 25): Promise<SyncRun[]> {
  return db
    .prepare(
      `SELECT run_id, provider, source, status, started_at, finished_at, details_json
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
          status: row.status,
          startedAt: row.started_at,
          finishedAt: row.finished_at,
          durationMs: details.durationMs,
          errorCount: details.errorCount,
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

interface FxFetchRow {
  provider: string | null;
  source: string | null;
  fetched_at: string;
  date: string;
  rate: number;
}

export interface FxFetch {
  provider: string | null;
  source: string | null;
  fetchedAt: string;
  date: string;
  rate: number;
}

/** Latest stored record per fx (provider, source), used as a proxy for "last fetched". */
export function listFxFetches(db: D1Database): Promise<FxFetch[]> {
  return db
    .prepare(
      `SELECT provider, source, created_at AS fetched_at, date, rate
         FROM fx_rates
        WHERE id IN (SELECT MAX(id) FROM fx_rates GROUP BY provider, source)
        ORDER BY created_at DESC`,
    )
    .all<FxFetchRow>()
    .then(({ results }) =>
      (results ?? []).map((row) => ({
        provider: row.provider,
        source: row.source,
        fetchedAt: row.fetched_at,
        date: row.date,
        rate: row.rate,
      })),
    );
}

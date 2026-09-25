const DEFAULT_LOCALE = "ko-KR";

export function formatMoney(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "KRW" ? 0 : 2,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 2 }).format(value)} ${currency}`;
  }
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 6 }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 2 }).format(value)}%`;
}

/** Unsigned percentage, for weights/allocations where a sign is meaningless. */
export function formatPercentPlain(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat(DEFAULT_LOCALE, { maximumFractionDigits: 2 }).format(value)}%`;
}

export function formatSignedMoney(value: number | null | undefined, currency: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMoney(value, currency)}`;
}

export function formatDate(value: string | null | undefined): string {
  return value ?? "-";
}

export function pnlClass(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return "";
  return value > 0 ? "up" : "down";
}

/** Formats a stored UTC timestamp ("YYYY-MM-DD HH:MM:SS") as KST (UTC+9). */
export function formatKst(value: string | null | undefined): string {
  if (!value) return "-";
  const parsed = Date.parse(value.replace(" ", "T") + "Z");
  if (!Number.isFinite(parsed)) return value;
  const date = new Date(parsed + 9 * 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatDurationMs(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (value < 1000) return `${Math.round(value)}ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

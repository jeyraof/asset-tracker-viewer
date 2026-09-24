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

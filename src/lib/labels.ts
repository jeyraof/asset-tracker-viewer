const PROVIDER_NAMES: Record<string, string> = {
  kis: "한국투자증권",
  kiwoom: "키움증권",
  toss: "토스증권",
};

const COUNTRY_FLAGS: Record<string, string> = {
  KR: "🇰🇷",
  US: "🇺🇸",
};

/** Human-readable broker name for a provider code, falling back to the code. */
export function providerName(code: string): string {
  return PROVIDER_NAMES[code.trim().toLowerCase()] ?? code;
}

/** Flag emoji for an ISO country code, falling back to the code. */
export function countryFlag(code: string): string {
  return COUNTRY_FLAGS[code.trim().toUpperCase()] ?? code;
}

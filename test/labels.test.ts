import { describe, expect, it } from "vitest";
import { countryFlag, providerName } from "../src/lib/labels";

describe("providerName", () => {
  it("maps known broker codes to names", () => {
    expect(providerName("kis")).toBe("한국투자증권");
    expect(providerName("kiwoom")).toBe("키움증권");
    expect(providerName("toss")).toBe("토스증권");
    expect(providerName("koreaexim")).toBe("수출입은행");
  });

  it("is case-insensitive and trims", () => {
    expect(providerName(" KIS ")).toBe("한국투자증권");
  });

  it("falls back to the raw code", () => {
    expect(providerName("samsung")).toBe("samsung");
  });
});

describe("countryFlag", () => {
  it("maps known country codes to flags", () => {
    expect(countryFlag("KR")).toBe("🇰🇷");
    expect(countryFlag("US")).toBe("🇺🇸");
  });

  it("is case-insensitive and trims", () => {
    expect(countryFlag(" kr ")).toBe("🇰🇷");
  });

  it("falls back to the raw code", () => {
    expect(countryFlag("JP")).toBe("JP");
  });
});

import { describe, expect, it } from "vitest";
import { deposit, evalAmount, netAsset } from "../src/lib/amounts";

describe("evalAmount", () => {
  it("returns the securities evaluation, excluding cash", () => {
    expect(evalAmount({ securitiesEvalAmount: 100, depositTotal: 5, settlementDeposit: 5 })).toBe(100);
  });

  it("returns null when missing", () => {
    expect(evalAmount({ securitiesEvalAmount: null, depositTotal: 5, settlementDeposit: null })).toBeNull();
  });
});

describe("deposit", () => {
  it("prefers the D+2 settlement deposit", () => {
    expect(deposit({ securitiesEvalAmount: 0, depositTotal: 1_000, settlementDeposit: 200 })).toBe(200);
  });

  it("falls back to the D+0 deposit when the D+2 figure is missing", () => {
    expect(deposit({ securitiesEvalAmount: 0, depositTotal: 1_000, settlementDeposit: null })).toBe(1_000);
  });

  it("keeps a zero D+2 deposit instead of falling back", () => {
    expect(deposit({ securitiesEvalAmount: 0, depositTotal: 1_000, settlementDeposit: 0 })).toBe(0);
  });

  it("returns null when both deposits are missing", () => {
    expect(deposit({ securitiesEvalAmount: 0, depositTotal: null, settlementDeposit: null })).toBeNull();
  });
});

describe("netAsset", () => {
  it("adds the settlement deposit to the securities evaluation", () => {
    expect(netAsset({ securitiesEvalAmount: 100, depositTotal: 1_000, settlementDeposit: 5 })).toBe(105);
  });

  it("falls back to the D+0 deposit when the D+2 figure is missing", () => {
    expect(netAsset({ securitiesEvalAmount: 100, depositTotal: 5, settlementDeposit: null })).toBe(105);
  });

  it("treats a missing part as zero", () => {
    expect(netAsset({ securitiesEvalAmount: 100, depositTotal: null, settlementDeposit: null })).toBe(100);
    expect(netAsset({ securitiesEvalAmount: null, depositTotal: 5, settlementDeposit: null })).toBe(5);
  });

  it("returns null only when both parts are missing", () => {
    expect(netAsset({ securitiesEvalAmount: null, depositTotal: null, settlementDeposit: null })).toBeNull();
  });
});

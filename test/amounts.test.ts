import { describe, expect, it } from "vitest";
import { evalAmount, netAsset } from "../src/lib/amounts";

describe("evalAmount", () => {
  it("returns the securities evaluation, excluding cash", () => {
    expect(evalAmount({ securitiesEvalAmount: 100, depositTotal: 5 })).toBe(100);
  });

  it("returns null when missing", () => {
    expect(evalAmount({ securitiesEvalAmount: null, depositTotal: 5 })).toBeNull();
  });
});

describe("netAsset", () => {
  it("adds deposit to the securities evaluation", () => {
    expect(netAsset({ securitiesEvalAmount: 100, depositTotal: 5 })).toBe(105);
  });

  it("treats a missing part as zero", () => {
    expect(netAsset({ securitiesEvalAmount: 100, depositTotal: null })).toBe(100);
    expect(netAsset({ securitiesEvalAmount: null, depositTotal: 5 })).toBe(5);
  });

  it("returns null only when both parts are missing", () => {
    expect(netAsset({ securitiesEvalAmount: null, depositTotal: null })).toBeNull();
  });
});

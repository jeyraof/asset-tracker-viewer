import { describe, expect, it } from "vitest";
import { areaPoints, linePoints, plotCoords, serializeChartPoints } from "../src/lib/chartData";

describe("plotCoords", () => {
  it("maps values to 0..100 with an inverted y axis", () => {
    expect(plotCoords([0, 10])).toEqual([
      { x: 0, y: 95 },
      { x: 100, y: 5 },
    ]);
  });

  it("centers a single value", () => {
    expect(plotCoords([5])).toEqual([{ x: 50, y: 50 }]);
  });

  it("centers a flat series", () => {
    expect(plotCoords([3, 3, 3])).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 50 },
      { x: 100, y: 50 },
    ]);
  });

  it("returns no coordinates for no values", () => {
    expect(plotCoords([])).toEqual([]);
  });
});

describe("line and area points", () => {
  const coords = [
    { x: 0, y: 50 },
    { x: 50, y: 20 },
    { x: 100, y: 80 },
  ];

  it("builds a polyline string", () => {
    expect(linePoints(coords)).toBe("0,50 50,20 100,80");
  });

  it("builds a closed area polygon", () => {
    expect(areaPoints(coords)).toBe("0,100 0,50 50,20 100,80 100,100");
  });
});

describe("serializeChartPoints", () => {
  it("emits compact [x, y, date, value, sub] tuples", () => {
    const json = serializeChartPoints([{ x: 0, y: 95, date: "2026-09-24", value: "₩1", sub: "평가손익" }]);
    expect(JSON.parse(json)).toEqual([[0, 95, "2026-09-24", "₩1", "평가손익"]]);
  });
});

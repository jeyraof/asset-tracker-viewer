import { describe, expect, it } from "vitest";
import { pnlTone, squarify, type TreemapRect } from "../src/lib/treemap";

const WIDTH = 100;
const HEIGHT = 60;

function area(rect: TreemapRect): number {
  return rect.width * rect.height;
}

function overlap(a: TreemapRect, b: TreemapRect): number {
  const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return x > 0 && y > 0 ? x * y : 0;
}

describe("squarify", () => {
  it("returns nothing for empty input or a degenerate area", () => {
    expect(squarify([], WIDTH, HEIGHT)).toEqual([]);
    expect(squarify([1, 2], 0, HEIGHT)).toEqual([]);
    expect(squarify([1, 2], WIDTH, 0)).toEqual([]);
  });

  it("fills a single tile with the whole area", () => {
    const rects = squarify([5], WIDTH, HEIGHT);
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
  });

  it("keeps every tile inside the bounds", () => {
    const rects = squarify([5, 3, 2, 1, 1, 1], WIDTH, HEIGHT);
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(WIDTH + 0.01);
      expect(rect.y + rect.height).toBeLessThanOrEqual(HEIGHT + 0.01);
    }
  });

  it("tiles the area with no overlaps", () => {
    const rects = squarify([5, 3, 2, 1, 1, 1], WIDTH, HEIGHT);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        if (a && b) expect(overlap(a, b)).toBeLessThan(0.5);
      }
    }
    const total = rects.reduce((sum, rect) => sum + area(rect), 0);
    expect(total).toBeCloseTo(WIDTH * HEIGHT, 0);
  });

  it("sizes tiles proportionally to their values", () => {
    const values = [4, 2, 2];
    const rects = squarify(values, WIDTH, HEIGHT);
    const totalArea = WIDTH * HEIGHT;
    const totalValue = values.reduce((sum, value) => sum + value, 0);
    rects.forEach((rect, index) => {
      const expected = ((values[index] ?? 0) / totalValue) * totalArea;
      expect(area(rect)).toBeCloseTo(expected, 0);
    });
  });

  it("preserves input order so values map back to their rects", () => {
    const values = [10, 1, 1, 1];
    const rects = squarify(values, WIDTH, HEIGHT);
    expect(rects).toHaveLength(values.length);
    expect(area(rects[0] ?? { x: 0, y: 0, width: 0, height: 0 })).toBeGreaterThan(
      area(rects[1] ?? { x: 0, y: 0, width: 0, height: 0 }),
    );
  });

  it("handles many tiles", () => {
    const values = Array.from({ length: 40 }, (_, index) => 1 + index);
    const rects = squarify(values, WIDTH, HEIGHT);
    expect(rects).toHaveLength(40);
    const total = rects.reduce((sum, rect) => sum + area(rect), 0);
    expect(total).toBeCloseTo(WIDTH * HEIGHT, 0);
  });
});

describe("pnlTone", () => {
  it("treats zero, null, and non-finite as flat", () => {
    expect(pnlTone(0)).toEqual({ dir: "flat", level: 0 });
    expect(pnlTone(null)).toEqual({ dir: "flat", level: 0 });
    expect(pnlTone(Number.NaN)).toEqual({ dir: "flat", level: 0 });
  });

  it("buckets gains by magnitude (1/2/3% steps)", () => {
    expect(pnlTone(0.5)).toEqual({ dir: "flat", level: 0 });
    expect(pnlTone(1.5)).toEqual({ dir: "up", level: 0 });
    expect(pnlTone(2.5)).toEqual({ dir: "up", level: 1 });
    expect(pnlTone(7.14)).toEqual({ dir: "up", level: 2 });
    expect(pnlTone(25)).toEqual({ dir: "up", level: 2 });
  });

  it("buckets losses by magnitude with a down direction", () => {
    expect(pnlTone(-0.5)).toEqual({ dir: "flat", level: 0 });
    expect(pnlTone(-1.5)).toEqual({ dir: "down", level: 0 });
    expect(pnlTone(-7.14)).toEqual({ dir: "down", level: 2 });
    expect(pnlTone(-25)).toEqual({ dir: "down", level: 2 });
  });
});

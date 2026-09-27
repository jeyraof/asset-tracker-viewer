export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Worst (largest) aspect ratio of a row laid along a side of length `side`. */
function worst(row: readonly number[], side: number): number {
  const rowSum = sum(row);
  if (rowSum <= 0) return Infinity;
  let large = -Infinity;
  let small = Infinity;
  for (const value of row) {
    if (value > large) large = value;
    if (value < small) small = value;
  }
  if (small <= 0) return Infinity;
  const sideSquared = side * side;
  const sumSquared = rowSum * rowSum;
  return Math.max((sideSquared * large) / sumSquared, sumSquared / (sideSquared * small));
}

/**
 * Squarified treemap (Bruls et al.): tiles a `width` x `height` area so each
 * rectangle's area is proportional to its value, keeping tiles as square as
 * possible. Values must be positive; the result preserves the input order and
 * scales to any number of items.
 */
export function squarify(values: readonly number[], width: number, height: number): TreemapRect[] {
  if (values.length === 0 || width <= 0 || height <= 0) return [];
  const total = sum(values);
  if (total <= 0) return [];

  const area = width * height;
  const remaining = values.map((value) => (value / total) * area);
  const rects: TreemapRect[] = [];

  function layout(items: number[], x: number, y: number, w: number, h: number): void {
    if (items.length === 0 || w <= 0 || h <= 0) return;
    if (items.length === 1) {
      rects.push({ x: round(x), y: round(y), width: round(w), height: round(h) });
      return;
    }

    const row: number[] = [];
    let index = 0;
    const side = Math.min(w, h);
    while (index < items.length) {
      const candidate = items[index];
      if (candidate === undefined) break;
      if (row.length === 0 || worst([...row, candidate], side) <= worst(row, side)) {
        row.push(candidate);
        index += 1;
      } else {
        break;
      }
    }

    const rowSum = sum(row);
    const thickness = rowSum / side;

    if (w >= h) {
      let offsetY = y;
      for (const value of row) {
        const itemHeight = (value / rowSum) * h;
        rects.push({ x: round(x), y: round(offsetY), width: round(thickness), height: round(itemHeight) });
        offsetY += itemHeight;
      }
      layout(items.slice(index), x + thickness, y, w - thickness, h);
    } else {
      let offsetX = x;
      for (const value of row) {
        const itemWidth = (value / rowSum) * w;
        rects.push({ x: round(offsetX), y: round(y), width: round(itemWidth), height: round(thickness) });
        offsetX += itemWidth;
      }
      layout(items.slice(index), x, y + thickness, w, h - thickness);
    }
  }

  layout(remaining, 0, 0, width, height);
  return rects;
}

export interface PnlTone {
  dir: "up" | "down" | "flat";
  level: 0 | 1 | 2 | 3 | 4;
}

/** Buckets a profit/loss rate into a direction and an intensity level (0..4). */
export function pnlTone(rate: number | null | undefined): PnlTone {
  if (rate == null || !Number.isFinite(rate) || rate === 0) return { dir: "flat", level: 0 };
  const magnitude = Math.abs(rate);
  const level: PnlTone["level"] = magnitude < 1 ? 0 : magnitude < 3 ? 1 : magnitude < 5 ? 2 : magnitude < 10 ? 3 : 4;
  return { dir: rate > 0 ? "up" : "down", level };
}

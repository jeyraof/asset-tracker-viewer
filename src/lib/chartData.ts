function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface PlotCoord {
  x: number;
  y: number;
}

/** Maps values to 0..100 plot coordinates (x left→right, y inverted with a small margin). */
export function plotCoords(values: readonly number[]): PlotCoord[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const count = values.length;
  return values.map((value, index) => {
    const x = count === 1 ? 50 : (index / (count - 1)) * 100;
    const normalized = range === 0 ? 0.5 : (value - min) / range;
    return { x: round2(x), y: round2(95 - normalized * 90) };
  });
}

export function linePoints(coords: readonly PlotCoord[]): string {
  return coords.map((coord) => `${coord.x},${coord.y}`).join(" ");
}

export function areaPoints(coords: readonly PlotCoord[]): string {
  const firstX = coords[0]?.x ?? 0;
  const lastX = coords[coords.length - 1]?.x ?? 100;
  return `${firstX},100 ${linePoints(coords)} ${lastX},100`;
}

export interface ChartPoint {
  x: number;
  y: number;
  date: string;
  value: string;
  sub: string;
}

/** Compact `[x, y, date, value, sub]` tuples for the client-side interactive cursor. */
export function serializeChartPoints(points: readonly ChartPoint[]): string {
  return JSON.stringify(points.map((point) => [point.x, point.y, point.date, point.value, point.sub]));
}

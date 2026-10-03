import type { ParcelShape } from "@/lib/parcel-shapes";

/** Every parcel cell shares this viewBox, so one scale holds across the sheet. */
export const CELL = { width: 240, height: 180 } as const;
const PADDING = 16;

type Outline = NonNullable<ParcelShape["outline"]>;

/**
 * SVG units per foot, chosen once for the whole sheet: the largest resolved parcel
 * just fits its cell and every other parcel is drawn at that same scale.
 */
export function commonScale(shapes: readonly ParcelShape[]): number {
  const halfW = CELL.width / 2 - PADDING;
  const halfH = CELL.height / 2 - PADDING;
  let scale = Number.POSITIVE_INFINITY;
  for (const { outline } of shapes) {
    if (!outline) continue;
    for (const [x, y] of outline) {
      if (x !== 0) scale = Math.min(scale, halfW / Math.abs(x));
      if (y !== 0) scale = Math.min(scale, halfH / Math.abs(y));
    }
  }
  return Number.isFinite(scale) ? scale : 1;
}

/** Closed SVG path for an outline given in feet around the parcel centre, north up. */
export function outlinePath(outline: Outline, scale: number): string {
  const cx = CELL.width / 2;
  const cy = CELL.height / 2;
  const points = outline.map(([x, y]) => `${(cx + x * scale).toFixed(1)} ${(cy + y * scale).toFixed(1)}`);
  return `M${points.join("L")}Z`;
}

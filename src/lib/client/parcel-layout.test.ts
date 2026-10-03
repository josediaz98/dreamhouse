import { describe, expect, it } from "vitest";
import type { ParcelShape } from "@/lib/parcel-shapes";
import { CELL, commonScale, outlinePath } from "@/lib/client/parcel-layout";

const square = (half: number): ParcelShape => ({
  propertyId: `p-${half}`,
  label: "test",
  apn: null,
  acres: null,
  outline: [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
    [-half, -half],
  ],
});

describe("parcel layout", () => {
  it("uses one scale for every lot, set by the largest outline", () => {
    const shapes = [square(50), square(200)];
    const scale = commonScale(shapes);
    expect(scale).toBeCloseTo((CELL.height / 2 - 16) / 200);
    // The small lot is drawn smaller, not stretched to fit its cell.
    const small = outlinePath(shapes[0]!.outline!, scale);
    const big = outlinePath(shapes[1]!.outline!, scale);
    const span = (d: string) => {
      const xs = [...d.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)].map((m) => Number(m[1]));
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(span(big) / span(small)).toBeCloseTo(4, 1);
  });

  it("keeps every point inside the cell", () => {
    const shapes = [square(120), { ...square(1), outline: [[300, -40], [-300, 40]] as const }];
    const scale = commonScale(shapes);
    for (const shape of shapes) {
      const d = outlinePath(shape.outline!, scale);
      for (const m of d.matchAll(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g)) {
        expect(Number(m[1])).toBeGreaterThanOrEqual(0);
        expect(Number(m[1])).toBeLessThanOrEqual(CELL.width);
        expect(Number(m[2])).toBeGreaterThanOrEqual(0);
        expect(Number(m[2])).toBeLessThanOrEqual(CELL.height);
      }
    }
  });

  it("falls back to scale 1 when nothing is resolved", () => {
    expect(commonScale([{ ...square(1), outline: null }])).toBe(1);
  });
});

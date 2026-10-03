import { describe, expect, it } from "vitest";
import { sideOfRoute } from "@/lib/server/gis";

// A north-south road at lon -123.40, drawn south to north, and the same road drawn north to south.
const NORTHBOUND: [number, number][] = [[-123.4, 38.6], [-123.4, 38.8]];
const SOUTHBOUND = [...NORTHBOUND].reverse();

describe("sideOfRoute", () => {
  it("is west for a point at lower longitude, regardless of drawing direction", () => {
    expect(sideOfRoute([-123.41, 38.7], [NORTHBOUND])).toBe("west");
    expect(sideOfRoute([-123.41, 38.7], [SOUTHBOUND])).toBe("west");
  });
  it("is east for a point at higher longitude", () => {
    expect(sideOfRoute([-123.39, 38.7], [NORTHBOUND])).toBe("east");
    expect(sideOfRoute([-123.39, 38.7], [SOUTHBOUND])).toBe("east");
  });
  it("refuses to call it within 30 m of the road or when the road is far away", () => {
    expect(sideOfRoute([-123.39995, 38.7], [NORTHBOUND])).toBeNull();
    expect(sideOfRoute([-123.3, 38.7], [NORTHBOUND])).toBeNull();
    expect(sideOfRoute([-123.41, 38.7], [])).toBeNull();
  });
});

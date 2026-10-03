import { describe, expect, it } from "vitest";
import { parseAnswer } from "@/lib/server/answers";

describe("parseAnswer", () => {
  it("septic", () => {
    expect(parseAnswer("septic_status", "Yes, a 3 bedroom system was approved by the county")).toEqual({ known: true, value: "approved" });
    expect(parseAnswer("septic_status", "The perc test failed, not feasible")).toEqual({ known: true, value: "infeasible" });
    expect(parseAnswer("septic_status", "Not sure, ask the county")).toEqual({ known: false, value: null });
  });
  it("tract map cap", () => {
    expect(parseAnswer("tract_map_height_cap_ft", "The tract map says 16 ft")).toEqual({ known: true, value: 16 });
    expect(parseAnswer("tract_map_height_cap_ft", "No cap on the tract map")).toEqual({ known: true, value: null });
    expect(parseAnswer("tract_map_height_cap_ft", "Limit is 24 feet")).toEqual({ known: true, value: null });
  });
  it("side of Hwy 1 refuses to guess when both are named", () => {
    expect(parseAnswer("hwy1_side", "East of Highway 1")).toEqual({ known: true, value: "east" });
    expect(parseAnswer("hwy1_side", "west, not east")).toEqual({ known: false, value: null });
  });
  it("water", () => {
    expect(parseAnswer("water_status", "Connected to the Sea Ranch Water Company")).toEqual({ known: true, value: "connected" });
  });
});

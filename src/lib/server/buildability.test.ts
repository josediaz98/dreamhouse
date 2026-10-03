import { describe, expect, it } from "vitest";
import type { HouseProgram, Question, SpecField, SpecFieldKey, FieldValue, FieldStatus } from "@/lib/contract";
import { checkBuildability } from "@/lib/server/buildability";
import { SEA_RANCH_RULES } from "@/lib/server/rules";

const PROGRAM: HouseProgram = { footprintSqFt: 2155, deckSqFt: 400, heightFt: 20, stories: 2 };
const SRC = { type: "listing", url: null, page: null, label: "Listing snapshot" } as const;

function f(key: SpecFieldKey, value: FieldValue, status: FieldStatus = "known", note: string | null = null): SpecField {
  return { propertyId: "p1", key, value, status, source: SRC, confidence: null, note };
}
const unk = (key: SpecFieldKey, note: string | null = null) => f(key, null, "unknown", note);

/** A lot where every check can pass for PROGRAM. */
const GOOD: readonly SpecField[] = [
  f("hwy1_side", "east"),
  f("acres", 0.51),
  f("septic_status", "approved"),
  f("water_status", "connected"),
  f("flood_zone", "X"),
];
const without = (fields: readonly SpecField[], key: SpecFieldKey) => fields.filter((x) => x.key !== key);
const run = (fields: readonly SpecField[], program = PROGRAM, qs: readonly Question[] = []) =>
  checkBuildability("p1", fields, SEA_RANCH_RULES, program, qs);
const check = (r: ReturnType<typeof run>, rule: string) => {
  const c = r.checks.find((x) => x.rule === rule);
  if (!c) throw new Error(`no ${rule} check`);
  return c;
};

describe("checkBuildability", () => {
  it("fails: 20 ft house vs a 16 ft tract-map cap west of Hwy 1", () => {
    const r = run([...without(GOOD, "hwy1_side"), f("hwy1_side", "west"), f("tract_map_height_cap_ft", 16)]);
    expect(check(r, "height").verdict).toBe("fail");
    expect(check(r, "height").required).toBe(16);
    expect(r.overall).toBe("fail");
  });

  it("passes: east of Hwy 1, every fact known and within limits", () => {
    const r = run(GOOD);
    expect(r.checks.map((c) => c.verdict)).toEqual(["pass", "pass", "pass", "pass", "pass"]);
    expect(r.overall).toBe("pass");
    expect(r.unknownCount).toBe(0);
    for (const c of r.checks) expect(c.sources.length).toBeGreaterThan(0);
  });

  it("unknown: missing septic, linked to the open seller question", () => {
    const q: Question = { id: "q1", propertyId: "p1", fieldKey: "septic_status", text: "?", status: "open", answer: null, answeredAt: null };
    const r = run([...without(GOOD, "septic_status"), unk("septic_status", "No septic information in the listing")], PROGRAM, [q]);
    expect(check(r, "septic").verdict).toBe("unknown");
    expect(check(r, "septic").questionId).toBe("q1");
    expect(r.overall).toBe("unknown");
    expect(r.unknownCount).toBe(1);
    expect(r.openQuestionIds).toEqual(["q1"]);
  });

  it("joins notes without double punctuation", () => {
    const withPeriod = run([...without(GOOD, "septic_status"), unk("septic_status", "The text states no septic approval or permit.")]);
    const withoutPeriod = run([...without(GOOD, "septic_status"), unk("septic_status", "No septic information in the listing")]);
    expect(check(withPeriod, "septic").detail).toBe("Septic status is not established. The text states no septic approval or permit.");
    expect(check(withoutPeriod, "septic").detail).toBe("Septic status is not established. No septic information in the listing.");
  });

  it("fail beats unknown", () => {
    const r = run([
      ...without(without(GOOD, "septic_status"), "hwy1_side"),
      unk("septic_status"),
      f("hwy1_side", "west"),
      f("tract_map_height_cap_ft", 16),
    ]);
    expect(check(r, "septic").verdict).toBe("unknown");
    expect(r.overall).toBe("fail");
  });

  it("height is unknown while the tract-map cap is unknown west of Hwy 1, then resolves", () => {
    const west = [...without(GOOD, "hwy1_side"), f("hwy1_side", "west")];
    const r = run([...west, unk("tract_map_height_cap_ft")]);
    expect(check(r, "height").verdict).toBe("unknown");
    // seller answers: no cap on the tract map -> 24 ft limit -> pass
    expect(check(run([...west, f("tract_map_height_cap_ft", null)]), "height").verdict).toBe("pass");
    // seller answers: 16 ft cap -> fail
    expect(check(run([...west, f("tract_map_height_cap_ft", 16)]), "height").verdict).toBe("fail");
  });

  it("height fails when over the largest possible limit even if the side is unknown", () => {
    const r = run([...without(GOOD, "hwy1_side"), unk("hwy1_side")], { ...PROGRAM, heightFt: 36 });
    expect(check(r, "height").verdict).toBe("fail");
  });

  it("coverage fails when footprint plus decks exceed 35% of the lot", () => {
    const r = run([...without(GOOD, "acres"), f("acres", 0.1)]); // 4,356 sq ft lot, 1,524 allowed
    expect(check(r, "lot_coverage").verdict).toBe("fail");
  });

  it("coverage is unknown without acreage", () => {
    expect(check(run([...without(GOOD, "acres"), unk("acres")]), "lot_coverage").verdict).toBe("unknown");
  });

  it("FEMA zone D stays unknown; a special flood hazard area is not a pass", () => {
    expect(check(run([...without(GOOD, "flood_zone"), unk("flood_zone", "FEMA zone D: flood hazard undetermined")]), "flood").verdict).toBe("unknown");
    expect(check(run([...without(GOOD, "flood_zone"), f("flood_zone", "AE")]), "flood").verdict).toBe("unknown");
  });

  it("never emits a setback check or claims a setback pass", () => {
    const r = run(GOOD);
    expect(r.checks.map((c) => c.rule)).not.toContain("setbacks");
    expect(JSON.stringify(r)).not.toMatch(/setback/i);
  });

  it("is deterministic", () => {
    expect(run(GOOD)).toEqual(run(GOOD));
  });
});

import { describe, expect, it } from "vitest";
import type { FieldStatus, FieldValue, HouseProgram, Property, SpecField, SpecFieldKey } from "@/lib/contract";
import { parseAnswer } from "@/lib/server/answers";
import { memoryRepo } from "@/lib/server/repo-memory";
import { SEA_RANCH_RULES } from "@/lib/server/rules";
import { runTool } from "@/lib/server/tools";

const PROGRAM: HouseProgram = { footprintSqFt: 2155, deckSqFt: 400, heightFt: 20, stories: 2 };
const SRC = { type: "listing", url: null, page: null, label: "Listing snapshot" } as const;
const prop = (id: string, acres: number, price: number): Property => ({
  id, apn: null, address: id, sourceUrl: `https://example.test/${id}`, priceUsd: price, acres, snapshotAt: "2026-10-03T00:00:00Z", isFixture: false,
});
const f = (pid: string, key: SpecFieldKey, value: FieldValue, status: FieldStatus = "known"): SpecField => ({
  propertyId: pid, key, value: status === "unknown" ? null : value, status, source: SRC, confidence: null, note: null,
});
const common = (pid: string): SpecField[] => [f(pid, "acres", 0.5), f(pid, "septic_status", "approved"), f(pid, "water_status", "connected"), f(pid, "flood_zone", "X")];

function seeded() {
  return memoryRepo({
    properties: [prop("east", 0.5, 100), prop("capped", 0.5, 200), prop("unsure", 0.5, 300)],
    rules: [...SEA_RANCH_RULES],
    fields: [
      ...common("east"), f("east", "hwy1_side", "east"),
      ...common("capped"), f("capped", "hwy1_side", "west"), f("capped", "tract_map_height_cap_ft", 16),
      ...common("unsure"), f("unsure", "hwy1_side", "west"), f("unsure", "tract_map_height_cap_ft", null, "unknown"),
    ],
  });
}

describe("tools", () => {
  it("search ranks pass > unknown > fail and counts eliminated lots", async () => {
    const out = await runTool(seeded(), "search_properties", { program: PROGRAM });
    expect(out.items.map((i) => [i.property.id, i.overall])).toEqual([["east", "pass"], ["unsure", "unknown"], ["capped", "fail"]]);
    expect(out.eliminatedCount).toBe(1);
  });

  it("answering a seller question flips the verdict", async () => {
    const repo = seeded();
    const { question } = await runTool(repo, "ask_seller", { propertyId: "unsure", fieldKey: "tract_map_height_cap_ft", text: "Does the tract map cap height at 16 ft?" });
    // idempotent while open
    const again = await runTool(repo, "ask_seller", { propertyId: "unsure", fieldKey: "tract_map_height_cap_ft", text: "again" });
    expect(again.question.id).toBe(question.id);

    const before = await runTool(repo, "check_buildability", { propertyId: "unsure", program: PROGRAM });
    expect(before.overall).toBe("unknown");
    expect(before.checks.find((c) => c.rule === "height")?.questionId).toBe(question.id);

    await repo.answerQuestion(question.id, "The tract map says 16 ft", parseAnswer("tract_map_height_cap_ft", "The tract map says 16 ft"));
    const after = await runTool(repo, "check_buildability", { propertyId: "unsure", program: PROGRAM });
    expect(after.overall).toBe("fail");
  });

  it("rejects bad input and unknown properties", async () => {
    await expect(runTool(seeded(), "check_buildability", { propertyId: "east", program: { heightFt: -1 } })).rejects.toThrow();
    await expect(runTool(seeded(), "get_spec", { propertyId: "nope" })).rejects.toThrow(/property nope/);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SPEC_FIELD_KEYS, type SpecField } from "@/lib/contract";
import { buildSpecFields, FactsSchema, parseSnapshot, validateFacts, type ExtractedFact } from "@/lib/server/ingest";

const snap = parseSnapshot(readFileSync("scripts/snapshots/38065-foothill-close.txt", "utf8"));
const facts = FactsSchema.parse(JSON.parse(readFileSync("scripts/snapshots/38065-foothill-close.facts.json", "utf8"))).facts;
const NO_PARCEL = { parcel: null, note: "test" } as const;
const byKey = (fs: readonly SpecField[]) => new Map(fs.map((f) => [f.key, f]));

describe("ingest", () => {
  it("parses the snapshot header", () => {
    expect(snap.address).toBe("38065 Foothill Close, The Sea Ranch, CA 95497");
    expect(snap.body).toContain("1/2 acre East-Meadow lot");
  });

  it("keeps every cached fact: each evidence quote is in the snapshot", () => {
    const { kept, rejected } = validateFacts(snap, facts);
    expect(rejected).toEqual([]);
    expect(kept).toHaveLength(facts.length);
  });

  it("rejects a fabricated quote and an out-of-vocabulary value", () => {
    const fake: ExtractedFact = { key: "septic_status", value: "approved", confidence: 0.9, evidence: "septic approved for 4 bedrooms" };
    const badValue: ExtractedFact = { key: "hwy1_side", value: "north", confidence: 0.9, evidence: "1/2 acre East-Meadow lot" };
    const { kept, rejected } = validateFacts(snap, [fake, badValue]);
    expect(kept).toEqual([]);
    expect(rejected.map((r) => r.why)).toEqual(["evidence is not a quote from the snapshot", "value outside the allowed vocabulary"]);
  });

  it("emits one row per key; a listing that states two acreages is a conflict, not a guess", () => {
    const fields = buildSpecFields("p1", snap, facts, NO_PARCEL, []);
    expect(fields.map((f) => f.key)).toEqual([...SPEC_FIELD_KEYS]);
    const m = byKey(fields);
    expect(m.get("acres")).toMatchObject({ status: "conflict", value: null });
    expect(m.get("price_usd")).toMatchObject({ status: "known", value: 120000 });
    expect(m.get("septic_status")?.status).toBe("unknown");
    expect(m.get("setback_front_ft")?.status).toBe("unknown"); // acreage unsettled -> no derived setbacks
  });

  it("GIS acreage settles the conflict and unlocks the under-1-acre setbacks", () => {
    const gisAcres: SpecField = { propertyId: "p1", key: "acres", value: 0.51, status: "known", source: { type: "gis", url: null, page: null, label: "parcels" }, confidence: null, note: null };
    const m = byKey(buildSpecFields("p1", snap, facts, NO_PARCEL, [gisAcres]));
    expect(m.get("acres")).toMatchObject({ status: "known", value: 0.51 });
    expect(m.get("acres")?.note).toMatch(/does not match/);
    expect(m.get("setback_front_ft")).toMatchObject({ status: "known", value: 20 });
    expect(m.get("setback_front_ft")?.source?.page).toBe(28);
  });

  it("labels a search-result summary as such, never as a listing page", () => {
    const price = buildSpecFields("p1", snap, facts, NO_PARCEL, []).find((f) => f.key === "price_usd");
    expect(price?.source?.label).toMatch(/^Search-result summary of listing, 2026-10-03/);
    expect(price?.source?.label).not.toMatch(/^Listing page/);
  });

  it("every cached facts file validates against its snapshot", () => {
    for (const name of ["35411-fly-cloud-road", "35604-timber-ridge-road", "35995-highway-1", "74-burl-tree", "38065-foothill-close", "39463-leeward-road"]) {
      const s = parseSnapshot(readFileSync(`scripts/snapshots/${name}.txt`, "utf8"));
      const f = FactsSchema.parse(JSON.parse(readFileSync(`scripts/snapshots/${name}.facts.json`, "utf8"))).facts;
      expect(validateFacts(s, f).rejected, name).toEqual([]);
    }
  });
});

/**
 * Listing snapshot -> typed spec fields with provenance.
 * The LLM only extracts (facts + a verbatim evidence quote). Everything else is deterministic:
 * evidence is verified against the snapshot, GIS wins over the listing, conflicts and gaps stay explicit.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { SPEC_FIELD_KEYS, type FieldValue, type SourceRef, type SpecField, type SpecFieldKey } from "@/lib/contract";
import type { Parcel } from "@/lib/server/gis";
import { RULE_IDS, SEA_RANCH_RULES } from "@/lib/server/rules";

export const EXTRACTION_MODEL = "claude-sonnet-5-5";

export interface Snapshot {
  readonly url: string;
  readonly address: string;
  readonly capturedAt: string;
  readonly kind: string;
  readonly body: string;
}

export function parseSnapshot(text: string): Snapshot {
  const [head = "", ...rest] = text.split(/^---$/m);
  const meta = new Map<string, string>();
  for (const line of head.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
  }
  const get = (k: string): string => {
    const v = meta.get(k);
    if (!v) throw new Error(`snapshot is missing "${k}"`);
    return v;
  };
  return { url: get("url"), address: get("address"), capturedAt: get("captured_at"), kind: get("kind"), body: rest.join("---").trim() };
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export const LISTING_KEYS = [
  "price_usd",
  "acres",
  "hwy1_side",
  "height_limit_ft",
  "tract_map_height_cap_ft",
  "septic_status",
  "water_status",
  "design_committee_status",
] as const satisfies readonly SpecFieldKey[];
type ListingKey = (typeof LISTING_KEYS)[number];

const SEPTIC_VALUES = ["approved", "installed", "not_required", "sewer_available", "denied", "infeasible"] as const;
const WATER_VALUES = ["connected", "available", "well_approved", "installed", "unavailable"] as const;

export interface ExtractedFact {
  readonly key: ListingKey;
  /** Null = the listing mentions the topic but does not settle it; `note` says why. */
  readonly value: FieldValue;
  readonly confidence: number;
  /** Verbatim substring of the snapshot body. */
  readonly evidence: string;
  readonly note?: string;
}

const FactSchema = z.object({
  key: z.enum(LISTING_KEYS),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  confidence: z.number().min(0).max(1),
  evidence: z.string().min(3),
  note: z.string().optional(),
});
export const FactsSchema = z.object({ facts: z.array(FactSchema) });

function valueOk(key: ListingKey, v: FieldValue): boolean {
  if (v === null) return true;
  switch (key) {
    case "price_usd":
    case "acres":
    case "height_limit_ft":
    case "tract_map_height_cap_ft":
      return typeof v === "number" && v > 0;
    case "hwy1_side":
      return v === "west" || v === "east";
    case "septic_status":
      return typeof v === "string" && (SEPTIC_VALUES as readonly string[]).includes(v);
    case "water_status":
      return typeof v === "string" && (WATER_VALUES as readonly string[]).includes(v);
    case "design_committee_status":
      return typeof v === "string" && v.length <= 120;
  }
}

const norm = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Drops anything the snapshot does not support: unknown value vocabulary or a quote that is not in the text. */
export function validateFacts(snapshot: Snapshot, facts: readonly ExtractedFact[]): { kept: ExtractedFact[]; rejected: { fact: ExtractedFact; why: string }[] } {
  const body = norm(snapshot.body);
  const kept: ExtractedFact[] = [];
  const rejected: { fact: ExtractedFact; why: string }[] = [];
  for (const fact of facts) {
    if (!body.includes(norm(fact.evidence))) rejected.push({ fact, why: "evidence is not a quote from the snapshot" });
    else if (!valueOk(fact.key, fact.value)) rejected.push({ fact, why: "value outside the allowed vocabulary" });
    else kept.push(fact);
  }
  return { kept, rejected };
}

export type Extractor = (snapshot: Snapshot) => Promise<readonly ExtractedFact[]>;

const SYSTEM = `You extract facts from a real-estate listing for a land buyer's database. Rules:
- Report only what the text states. If the text does not say it, do not report it. Never infer.
- "evidence" must be an exact, contiguous quote from the text.
- If the text states two different values for one key, report both as separate facts.
- septic_status: "approved" only if the text says approval or a permit. A perc test or septic design alone is NOT approval: report value null with a note.
- water_status / septic_status "available" / "sewer_available" only for public service stated as available at the lot or street.
- hwy1_side: only if the text says east or west of Highway 1. A neighbourhood name is not evidence.
- design_committee_status: the stage in the text, e.g. "approved conceptual plans".
- Numbers are plain numbers (price in USD, acres as decimals, feet).`;

export function claudeExtractor(client: Anthropic = new Anthropic()): Extractor {
  return async (snapshot) => {
    const res = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      tools: [
        {
          name: "record_facts",
          description: "Record the facts found in the listing text.",
          input_schema: {
            type: "object",
            properties: {
              facts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    key: { type: "string", enum: [...LISTING_KEYS] },
                    value: { type: ["string", "number", "boolean", "null"] },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    evidence: { type: "string" },
                    note: { type: "string" },
                  },
                  required: ["key", "value", "confidence", "evidence"],
                },
              },
            },
            required: ["facts"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_facts" },
      messages: [{ role: "user", content: `Listing text:\n\n${snapshot.body}` }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") throw new Error("extractor returned no tool call");
    return FactsSchema.parse(block.input).facts;
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const MANUAL_URL = "https://www.tsra.org/wp-content/uploads/2020/06/DM_v7.pdf";
const manual = (page: number, label: string): SourceRef => ({ type: "manual", url: MANUAL_URL, page, label: `Sea Ranch Design Manual (Oct 2013) ${label}` });

export interface Resolution {
  readonly parcel: Parcel | null;
  readonly note: string;
}

function field(propertyId: string, key: SpecFieldKey, value: FieldValue, status: SpecField["status"], source: SourceRef | null, confidence: number | null, note: string | null): SpecField {
  return { propertyId, key, value: status === "known" ? value : null, status, source, confidence, note };
}

/** One row per SpecFieldKey, always. Nothing is guessed: missing means unknown with a reason. */
export function buildSpecFields(
  propertyId: string,
  snapshot: Snapshot,
  facts: readonly ExtractedFact[],
  resolution: Resolution,
  gis: readonly SpecField[],
): SpecField[] {
  const listing: SourceRef = { type: "listing", url: snapshot.url, page: null, label: `Listing snapshot ${snapshot.capturedAt.slice(0, 10)}` };
  const out = new Map<SpecFieldKey, SpecField>();
  for (const key of SPEC_FIELD_KEYS) out.set(key, field(propertyId, key, null, "unknown", null, null, "Not stated in the listing or in GIS"));

  // 1. listing facts
  const byKey = new Map<ListingKey, ExtractedFact[]>();
  for (const f of facts) byKey.set(f.key, [...(byKey.get(f.key) ?? []), f]);
  for (const [key, fs] of byKey) {
    const values = [...new Set(fs.filter((f) => f.value !== null).map((f) => f.value))];
    const first = fs[0];
    if (!first) continue;
    if (values.length > 1) {
      out.set(key, field(propertyId, key, null, "conflict", listing, null, `Listing states ${values.join(" and ")}`));
    } else if (values.length === 1) {
      out.set(key, field(propertyId, key, values[0] ?? null, "known", listing, Math.min(...fs.map((f) => f.confidence)), null));
    } else {
      out.set(key, field(propertyId, key, null, "unknown", listing, null, first.note ?? "Listing mentions it but does not settle it"));
    }
  }

  // 2. GIS (deterministic) wins over the listing
  const listedAcres = (byKey.get("acres") ?? []).map((f) => f.value).filter((v): v is number => typeof v === "number");
  for (const g of gis) {
    if (g.key === "acres") {
      if (g.status !== "known" || typeof g.value !== "number") continue;
      const gisAcres = g.value;
      const agrees = listedAcres.some((a) => Math.abs(a - gisAcres) / a <= 0.1);
      const note =
        listedAcres.length === 0
          ? null
          : agrees
            ? listedAcres.some((a) => Math.abs(a - gisAcres) / a > 0.1)
              ? `County parcel ${gisAcres.toFixed(2)} ac; the listing states ${[...new Set(listedAcres)].join(" and ")} ac, one of which does not match`
              : null
            : `County parcel ${gisAcres.toFixed(2)} ac does not match the listing (${[...new Set(listedAcres)].join(" / ")} ac); APN match may be wrong`;
      out.set("acres", agrees || listedAcres.length === 0 ? { ...g, note } : field(propertyId, "acres", null, "conflict", g.source, null, note));
      continue;
    }
    if (g.status === "known" || (g.status === "unknown" && g.note)) {
      const existing = out.get(g.key);
      if (g.status === "known" || existing?.status === "unknown") out.set(g.key, { ...g, propertyId });
    }
  }
  if (resolution.parcel === null) {
    for (const key of ["flood_zone", "coastal_zone", "fire_hazard_zone", "zoning", "land_use"] as const) {
      const cur = out.get(key);
      if (cur?.status === "unknown") out.set(key, { ...cur, note: `APN not resolved, so no GIS lookup: ${resolution.note}` });
    }
  }

  // 3. rules-derived fields (cited to the manual page)
  const coverage = SEA_RANCH_RULES.find((r) => r.id === RULE_IDS.coverage);
  if (coverage) out.set("lot_coverage_max_pct", field(propertyId, "lot_coverage_max_pct", coverage.value, "known", coverage.source, null, "Bane Bill lots can have stricter limits (§6.6)"));
  const side = out.get("hwy1_side");
  if (side?.status === "known") {
    const r = SEA_RANCH_RULES.find((x) => x.id === (side.value === "west" ? RULE_IDS.heightWest : RULE_IDS.heightEast));
    const listed = out.get("height_limit_ft");
    if (r && listed?.status !== "known") out.set("height_limit_ft", field(propertyId, "height_limit_ft", r.value, "known", r.source, null, side.value === "west" ? "16 ft where the recorded tract map says so" : null));
  }
  const acres = out.get("acres");
  if (acres?.status === "known" && typeof acres.value === "number" && acres.value < 1) {
    for (const [key, id] of [
      ["setback_front_ft", RULE_IDS.setbackFront],
      ["setback_side_ft", RULE_IDS.setbackSide],
      ["setback_rear_ft", RULE_IDS.setbackRear],
    ] as const) {
      const r = SEA_RANCH_RULES.find((x) => x.id === id);
      if (r) out.set(key, field(propertyId, key, r.value, "known", r.source, null, "Standard minimum for lots under 1 acre; the recorded subdivision map may be stricter"));
    }
  }
  const env = SEA_RANCH_RULES.find((r) => r.id === RULE_IDS.setbackEnv);
  if (env) out.set("env_setback_ft", field(propertyId, "env_setback_ft", env.value, "known", env.source, null, "Applies only where a wet zone, seep or intermittent stream is present"));

  return SPEC_FIELD_KEYS.map((k) => {
    const f = out.get(k);
    if (!f) throw new Error(`missing field ${k}`);
    return f;
  });
}

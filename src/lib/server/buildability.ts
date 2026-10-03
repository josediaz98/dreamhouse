/**
 * Deterministic buildability verdicts. Pure: no I/O, no LLM.
 * overall: fail beats unknown, unknown beats pass.
 *
 * Not checked (needs lot geometry the contract does not carry): setbacks.
 * They are seeded in `rules` and stored as spec fields, but produce no verdict.
 */
import type {
  BuildabilityResult,
  FieldValue,
  HouseProgram,
  Question,
  Rule,
  RuleCheck,
  RuleKey,
  SourceRef,
  SpecField,
  SpecFieldKey,
  Verdict,
} from "@/lib/contract";
import { RULE_IDS } from "@/lib/server/rules";

const SQFT_PER_ACRE = 43_560;

const SEPTIC_PASS = ["approved", "installed", "not_required"] as const;
const SEPTIC_FAIL = ["denied", "infeasible"] as const;
const WATER_PASS = ["connected", "well_approved", "installed"] as const;
const WATER_FAIL = ["unavailable"] as const;
const FLOOD_PASS = ["X"] as const;

type FieldMap = ReadonlyMap<SpecFieldKey, SpecField>;

interface Draft {
  readonly rule: RuleKey;
  readonly label: string;
  readonly verdict: Verdict;
  readonly detail: string;
  readonly required: FieldValue;
  readonly actual: FieldValue;
  readonly sources: readonly SourceRef[];
  /** Field keys whose seller question would resolve this check. */
  readonly askKeys: readonly SpecFieldKey[];
}

function fieldMap(fields: readonly SpecField[]): FieldMap {
  return new Map(fields.map((f) => [f.key, f]));
}

function known(map: FieldMap, key: SpecFieldKey): SpecField | null {
  const f = map.get(key);
  return f !== undefined && f.status === "known" ? f : null;
}

function knownNumber(map: FieldMap, key: SpecFieldKey): number | null {
  const f = known(map, key);
  return f !== null && typeof f.value === "number" ? f.value : null;
}

function knownString(map: FieldMap, key: SpecFieldKey): string | null {
  const f = known(map, key);
  return f !== null && typeof f.value === "string" ? f.value : null;
}

function sourcesOf(...fs: readonly (SpecField | null | undefined)[]): SourceRef[] {
  const out: SourceRef[] = [];
  for (const f of fs) if (f?.source) out.push(f.source);
  return out;
}

function noteOf(f: SpecField | undefined): string {
  return f?.note ? ` ${f.note}.` : "";
}

function ruleById(rules: readonly Rule[], id: string): Rule | null {
  return rules.find((r) => r.id === id) ?? null;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

// ---------------------------------------------------------------------------
// Height
// ---------------------------------------------------------------------------

interface HeightScenario {
  readonly limit: number;
}

function checkHeight(map: FieldMap, rules: readonly Rule[], program: HouseProgram): Draft {
  const west = ruleById(rules, RULE_IDS.heightWest);
  const tract = ruleById(rules, RULE_IDS.heightTractMap);
  const east = ruleById(rules, RULE_IDS.heightEast);
  const sideField = map.get("hwy1_side");
  const capField = map.get("tract_map_height_cap_ft");
  const base = { rule: "height", label: "Height", required: null, actual: program.heightFt } as const;

  if (west === null || tract === null || east === null) {
    return { ...base, verdict: "unknown", detail: "Height rules are not loaded.", sources: [], askKeys: [] };
  }

  const side = knownString(map, "hwy1_side");
  const cap = knownNumber(map, "tract_map_height_cap_ft");
  const capKnownNone = known(map, "tract_map_height_cap_ft") !== null && cap === null;

  // Enumerate every scenario consistent with the known facts; the verdict holds only if it holds in all.
  const sides: readonly ("west" | "east")[] = side === "west" ? ["west"] : side === "east" ? ["east"] : ["west", "east"];
  const scenarios: HeightScenario[] = [];
  for (const s of sides) {
    if (s === "east") {
      scenarios.push({ limit: east.value });
      continue;
    }
    if (cap !== null) scenarios.push({ limit: Math.min(west.value, cap) });
    else if (capKnownNone) scenarios.push({ limit: west.value });
    else {
      scenarios.push({ limit: west.value });
      scenarios.push({ limit: Math.min(west.value, tract.value) });
    }
  }
  const lo = Math.min(...scenarios.map((s) => s.limit));
  const hi = Math.max(...scenarios.map((s) => s.limit));
  const sources = [...sourcesOf(sideField, capField), west.source];
  const askKeys: SpecFieldKey[] = [];
  if (side === null) askKeys.push("hwy1_side");
  if (side !== "east" && cap === null && !capKnownNone) askKeys.push("tract_map_height_cap_ft");

  if (program.heightFt > hi) {
    const why = cap !== null && cap === hi ? "recorded tract map" : side === "east" ? "east of Hwy 1" : "Sea Ranch Design Manual";
    return {
      ...base,
      verdict: "fail",
      required: hi,
      detail: `Limit ${fmt(hi)} ft (${why}); your house is ${fmt(program.heightFt)} ft.`,
      sources,
      askKeys: [],
    };
  }
  if (program.heightFt <= lo) {
    const via = cap !== null && cap === lo ? "recorded tract map" : side === "east" ? "east of Hwy 1" : side === "west" ? "west of Hwy 1" : "worst case";
    return {
      ...base,
      verdict: "pass",
      required: lo,
      detail: `Limit ${fmt(lo)} ft (${via}); your house is ${fmt(program.heightFt)} ft.`,
      sources,
      askKeys: [],
    };
  }
  const missing: string[] = [];
  if (side === null) missing.push("which side of Hwy 1 the lot is on");
  if (side !== "east" && cap === null && !capKnownNone) missing.push(`whether the recorded tract map caps height at ${fmt(tract.value)} ft`);
  return {
    ...base,
    verdict: "unknown",
    required: null,
    detail: `Limit is between ${fmt(lo)} and ${fmt(hi)} ft depending on ${missing.join(" and ")}; your house is ${fmt(program.heightFt)} ft.${noteOf(capField)}`,
    sources,
    askKeys,
  };
}

// ---------------------------------------------------------------------------
// Lot coverage
// ---------------------------------------------------------------------------

function checkCoverage(map: FieldMap, rules: readonly Rule[], program: HouseProgram): Draft {
  const rule = ruleById(rules, RULE_IDS.coverage);
  const acresField = map.get("acres");
  const acres = knownNumber(map, "acres");
  const used = program.footprintSqFt + program.deckSqFt;
  const base = { rule: "lot_coverage", label: "Lot coverage", actual: null } as const;

  if (rule === null) {
    return { ...base, required: null, verdict: "unknown", detail: "Coverage rule is not loaded.", sources: [], askKeys: [] };
  }
  if (acres === null || acres <= 0) {
    return {
      ...base,
      required: rule.value,
      verdict: "unknown",
      detail: `Lot area is not known, so footprint plus decks (${fmt(used)} sq ft) cannot be compared with the ${rule.value}% limit.${noteOf(acresField)}`,
      sources: [rule.source],
      askKeys: ["acres"],
    };
  }
  const lotSqFt = acres * SQFT_PER_ACRE;
  const allowed = Math.floor((lotSqFt * rule.value) / 100);
  const pct = Math.round((used / lotSqFt) * 1000) / 10;
  const ok = used <= allowed;
  return {
    ...base,
    required: rule.value,
    actual: pct,
    verdict: ok ? "pass" : "fail",
    detail: `Footprint plus decks ${fmt(used)} sq ft of ${fmt(allowed)} sq ft allowed (${rule.value}% of ${fmt(acres)} ac).`,
    sources: [...sourcesOf(acresField), rule.source],
    askKeys: [],
  };
}

// ---------------------------------------------------------------------------
// Status fields: septic, water, flood
// ---------------------------------------------------------------------------

function checkStatus(
  map: FieldMap,
  key: SpecFieldKey,
  rule: RuleKey,
  label: string,
  pass: readonly string[],
  fail: readonly string[],
  extraSource: SourceRef | null,
  noun: string,
): Draft {
  const f = map.get(key);
  const value = knownString(map, key);
  const sources = [...sourcesOf(f), ...(extraSource ? [extraSource] : [])];
  const base = { rule, label, required: null, askKeys: [key] } as const;
  if (value === null) {
    return { ...base, actual: null, verdict: "unknown", detail: `${noun} status is not established.${noteOf(f)}`, sources };
  }
  if (pass.includes(value)) return { ...base, actual: value, verdict: "pass", detail: `${noun}: ${value}.${noteOf(f)}`, sources, askKeys: [] };
  if (fail.includes(value)) return { ...base, actual: value, verdict: "fail", detail: `${noun}: ${value}.${noteOf(f)}`, sources, askKeys: [] };
  return {
    ...base,
    actual: value,
    verdict: "unknown",
    detail: `${noun} is "${value}", which needs review before it counts as a pass.${noteOf(f)}`,
    sources,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const MANUAL_SEPTIC: SourceRef = {
  type: "manual",
  url: "https://www.tsra.org/wp-content/uploads/2020/06/DM_v7.pdf",
  page: 35,
  label: "Sea Ranch Design Manual (Oct 2013) §7.2, p. 7-2",
};

/**
 * @param questions open or answered questions of this property; used to link unknown checks to a seller question.
 */
export function checkBuildability(
  propertyId: string,
  fields: readonly SpecField[],
  rules: readonly Rule[],
  program: HouseProgram,
  questions: readonly Question[] = [],
): BuildabilityResult {
  const map = fieldMap(fields);
  const drafts: Draft[] = [
    checkHeight(map, rules, program),
    checkCoverage(map, rules, program),
    checkStatus(map, "septic_status", "septic", "Septic", SEPTIC_PASS, SEPTIC_FAIL, MANUAL_SEPTIC, "Septic"),
    checkStatus(map, "water_status", "water", "Water", WATER_PASS, WATER_FAIL, null, "Water"),
    checkStatus(map, "flood_zone", "flood", "Flood zone", FLOOD_PASS, [], null, "FEMA flood zone"),
  ];

  const open = questions.filter((q) => q.propertyId === propertyId && q.status === "open");
  const checks: RuleCheck[] = drafts.map(({ askKeys, ...d }) => ({
    ...d,
    questionId: d.verdict === "unknown" ? (open.find((q) => askKeys.includes(q.fieldKey))?.id ?? null) : null,
  }));

  const overall: Verdict = checks.some((c) => c.verdict === "fail")
    ? "fail"
    : checks.some((c) => c.verdict === "unknown")
      ? "unknown"
      : "pass";

  return {
    propertyId,
    overall,
    checks,
    unknownCount: checks.filter((c) => c.verdict === "unknown").length,
    openQuestionIds: open.map((q) => q.id),
  };
}

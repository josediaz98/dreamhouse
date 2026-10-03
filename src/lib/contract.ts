/**
 * DREAMHOUSE shared contract. Source of truth for the types that cross lanes.
 *
 * Owner: coordinator. Lanes must not edit this file; ask the coordinator for a change.
 * Back implements it, Front consumes it, Brand does not touch it.
 *
 * Design rule: the LLM extracts and explains. Verdicts (pass / fail / unknown) are
 * computed deterministically from the rules table. An LLM never decides a pass.
 */

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const SPEC_FIELD_KEYS = [
  "price_usd",
  "acres",
  "zoning",
  "land_use",
  "coastal_zone",
  "flood_zone",
  "fire_hazard_zone",
  "hwy1_side",
  "height_limit_ft",
  "tract_map_height_cap_ft",
  "lot_coverage_max_pct",
  "setback_front_ft",
  "setback_side_ft",
  "setback_rear_ft",
  "env_setback_ft",
  "septic_status",
  "water_status",
  "design_committee_status",
] as const;
export type SpecFieldKey = (typeof SPEC_FIELD_KEYS)[number];

export const RULE_KEYS = [
  "height",
  "lot_coverage",
  "setbacks",
  "fire_hazard",
  "flood",
  "septic",
  "water",
  "coastal_permit",
  "design_review",
] as const;
export type RuleKey = (typeof RULE_KEYS)[number];

export type FieldStatus = "known" | "unknown" | "conflict";
export type SourceType = "listing" | "gis" | "manual" | "seller";
export type Verdict = "pass" | "fail" | "unknown";
export type QuestionStatus = "open" | "answered";
export type FieldValue = string | number | boolean | null;

// ---------------------------------------------------------------------------
// Data model (mirrors the Supabase tables; Back owns the migrations)
// ---------------------------------------------------------------------------

export const TABLES = {
  properties: "properties",
  specFields: "spec_fields",
  rules: "rules",
  questions: "questions",
  calls: "calls",
} as const;

export interface SourceRef {
  readonly type: SourceType;
  readonly url: string | null;
  /** Page number when the source is a PDF. */
  readonly page: number | null;
  /** Short human label, e.g. "Sea Ranch Design Manual, 2013 ed." */
  readonly label: string;
}

export interface Property {
  readonly id: string;
  readonly apn: string | null;
  readonly address: string;
  readonly sourceUrl: string;
  readonly priceUsd: number | null;
  readonly acres: number | null;
  /** ISO timestamp of the hand-made listing snapshot. */
  readonly snapshotAt: string;
  /** True for placeholder rows. Fixtures must never appear in the final demo. */
  readonly isFixture: boolean;
}

export interface SpecField {
  readonly propertyId: string;
  readonly key: SpecFieldKey;
  /** Null when status is "unknown". */
  readonly value: FieldValue;
  readonly status: FieldStatus;
  readonly source: SourceRef | null;
  /** 0..1. Null for deterministic GIS or manual values. */
  readonly confidence: number | null;
  /** Why it is unknown or in conflict, e.g. "FEMA zone D: flood hazard undetermined". */
  readonly note: string | null;
}

export interface Rule {
  readonly id: string;
  readonly jurisdiction: string;
  readonly key: RuleKey;
  readonly operator: "<=" | ">=" | "==";
  readonly value: number;
  readonly unit: "ft" | "pct" | "sqft" | "none";
  /** Free text condition, e.g. "west of Hwy 1". */
  readonly condition: string | null;
  readonly source: SourceRef;
}

export interface Question {
  readonly id: string;
  readonly propertyId: string;
  readonly fieldKey: SpecFieldKey;
  readonly text: string;
  readonly status: QuestionStatus;
  readonly answer: string | null;
  readonly answeredAt: string | null;
}

export interface CallReceipt {
  readonly id: string;
  readonly agentId: string;
  readonly tool: McpToolName;
  /** Sandbox amount in USD. */
  readonly amountUsd: number;
  /** Stripe MPP payment reference. Null when the call was free. */
  readonly paymentRef: string | null;
  readonly ts: string;
}

// ---------------------------------------------------------------------------
// Buyer input
// ---------------------------------------------------------------------------

/** What the buyer wants to build. Units are US customary. */
export interface HouseProgram {
  readonly footprintSqFt: number;
  /** Decks count toward lot coverage in Sea Ranch (Sonoma County). */
  readonly deckSqFt: number;
  readonly heightFt: number;
  readonly stories: number;
}

// ---------------------------------------------------------------------------
// Buildability verdicts
// ---------------------------------------------------------------------------

export interface RuleCheck {
  readonly rule: RuleKey;
  readonly label: string;
  readonly verdict: Verdict;
  /** One sentence a buyer can read, e.g. "Limit 16 ft (tract map); your house is 20 ft." */
  readonly detail: string;
  readonly required: FieldValue;
  readonly actual: FieldValue;
  readonly sources: readonly SourceRef[];
  /** Set when verdict is "unknown" and a seller question exists for it. */
  readonly questionId: string | null;
}

export interface BuildabilityResult {
  readonly propertyId: string;
  /** fail beats unknown, unknown beats pass. */
  readonly overall: Verdict;
  readonly checks: readonly RuleCheck[];
  readonly unknownCount: number;
  readonly openQuestionIds: readonly string[];
}

// ---------------------------------------------------------------------------
// MCP tools. Same shapes are served over REST for the Front (see API_ROUTES).
// ---------------------------------------------------------------------------

export const MCP_TOOLS = [
  "search_properties",
  "get_spec",
  "check_buildability",
  "ask_seller",
] as const;
export type McpToolName = (typeof MCP_TOOLS)[number];

export interface SearchPropertiesInput {
  readonly maxPriceUsd?: number;
  readonly minAcres?: number;
  readonly maxAcres?: number;
  /** When present, every item also carries its buildability verdict. */
  readonly program?: HouseProgram;
}

export interface SearchItem {
  readonly property: Property;
  readonly knownCount: number;
  readonly unknownCount: number;
  /** Null when no program was given. */
  readonly overall: Verdict | null;
}

export interface SearchPropertiesOutput {
  readonly items: readonly SearchItem[];
  /** Lots ruled out by a failing rule. Drives the "visits avoided" counter. */
  readonly eliminatedCount: number;
}

export interface GetSpecInput {
  readonly propertyId: string;
}
export interface GetSpecOutput {
  readonly property: Property;
  readonly fields: readonly SpecField[];
}

export interface CheckBuildabilityInput {
  readonly propertyId: string;
  readonly program: HouseProgram;
}
export type CheckBuildabilityOutput = BuildabilityResult;

export interface AskSellerInput {
  readonly propertyId: string;
  readonly fieldKey: SpecFieldKey;
  readonly text: string;
}
export interface AskSellerOutput {
  readonly question: Question;
}

export interface McpToolIO {
  readonly search_properties: {
    readonly input: SearchPropertiesInput;
    readonly output: SearchPropertiesOutput;
  };
  readonly get_spec: { readonly input: GetSpecInput; readonly output: GetSpecOutput };
  readonly check_buildability: {
    readonly input: CheckBuildabilityInput;
    readonly output: CheckBuildabilityOutput;
  };
  readonly ask_seller: { readonly input: AskSellerInput; readonly output: AskSellerOutput };
}

// ---------------------------------------------------------------------------
// REST surface for the Front (Back implements; paid routes return HTTP 402 via MPP)
// ---------------------------------------------------------------------------

export const API_ROUTES = {
  /** POST body = McpToolIO[tool]["input"], response = McpToolIO[tool]["output"]. */
  tool: (tool: McpToolName) => `/api/tools/${tool}`,
  /** GET ?status=open|answered -> { questions: Question[] } */
  questions: "/api/questions",
  /** POST { answer: string } -> { question: Question } */
  answerQuestion: (id: string) => `/api/questions/${id}/answer`,
  /** GET -> { calls: CallReceipt[] } latest first, for the receipt panel. */
  calls: "/api/calls",
} as const;

/**
 * Realtime: the Front subscribes with supabase-js `postgres_changes` to
 * TABLES.specFields (INSERT, UPDATE) and TABLES.questions (INSERT, UPDATE).
 * When a seller answers, Back updates the question and the matching spec_field in
 * one transaction, so one event refreshes the verdict.
 */

// ---------------------------------------------------------------------------
// Trace panel (Front-only view model, defined here so Back can emit the same shape)
// ---------------------------------------------------------------------------

export type TraceStatus = "running" | "ok" | "unknown" | "fail";

export interface TraceEvent {
  readonly id: string;
  readonly tool: McpToolName | "resolve_parcel";
  readonly status: TraceStatus;
  readonly label: string;
  /** Wall-clock milliseconds; null while running. */
  readonly ms: number | null;
}

import type { HouseProgram, RuleKey, SpecFieldKey } from "@/lib/contract";

/** One realtime notification. Consumers refetch; they never trust the payload for values. */
export interface ChangeEvent {
  readonly table: "spec_fields" | "questions";
  /** Null when the source could not tell which property changed. */
  readonly propertyId: string | null;
}

export type ChangeHandler = (event: ChangeEvent) => void;

/** What the buyer's agent is trying to build. Mirrors the program used in the demo flow. */
export const DEFAULT_PROGRAM = {
  footprintSqFt: 2155,
  deckSqFt: 400,
  heightFt: 26,
  stories: 2,
} as const satisfies HouseProgram;

/** Which spec field answers each rule check. Used to draft seller questions. */
export const FIELD_FOR_RULE = {
  height: "height_limit_ft",
  lot_coverage: "lot_coverage_max_pct",
  setbacks: "setback_front_ft",
  fire_hazard: "fire_hazard_zone",
  flood: "flood_zone",
  septic: "septic_status",
  water: "water_status",
  coastal_permit: "coastal_zone",
  design_review: "design_committee_status",
} as const satisfies Record<RuleKey, SpecFieldKey>;

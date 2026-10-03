import type { SpecFieldKey } from "@/lib/contract";

/** Human label for each spec field. The seller never sees a raw key. */
export const FIELD_LABEL = {
  price_usd: "Price",
  acres: "Lot size",
  zoning: "Zoning",
  land_use: "Land use",
  coastal_zone: "Coastal zone",
  flood_zone: "Flood zone",
  fire_hazard_zone: "Fire hazard zone",
  hwy1_side: "Side of Hwy 1",
  height_limit_ft: "Height limit",
  tract_map_height_cap_ft: "Tract-map height cap",
  lot_coverage_max_pct: "Lot coverage",
  setback_front_ft: "Front setback",
  setback_side_ft: "Side setback",
  setback_rear_ft: "Rear setback",
  env_setback_ft: "Environmental setback",
  septic_status: "Septic",
  water_status: "Water",
  design_committee_status: "Design committee",
} as const satisfies Record<SpecFieldKey, string>;

/** Presenter shortcuts: fill the input, never auto-send. */
export const DEMO_ANSWERS: Partial<Record<SpecFieldKey, readonly string[]>> = {
  septic_status: ["Septic permitted for 3 bedrooms"],
  water_status: ["Connected to the Sea Ranch Water Company"],
  flood_zone: ["Outside the special flood hazard area"],
  tract_map_height_cap_ft: ["No height cap on the tract map"],
};

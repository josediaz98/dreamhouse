/**
 * Placeholder data so the Front can build before the Back is ready.
 * Owner: coordinator. Every row is isFixture: true. Prices and acreage come from search
 * snippets and are UNVERIFIED. Replace with ingested rows before recording the demo.
 */
import type {
  BuildabilityResult,
  FieldStatus,
  FieldValue,
  HouseProgram,
  Property,
  Question,
  SourceRef,
  SpecField,
  SpecFieldKey,
} from "@/lib/contract";

const MANUAL: SourceRef = {
  type: "manual",
  url: "https://www.tsra.org/wp-content/uploads/2020/06/DM_v7.pdf",
  page: null,
  label: "Sea Ranch Design Manual and Rules (2013 ed.)",
};
const GIS: SourceRef = {
  type: "gis",
  url: "https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/ArcGIS/rest/services/CDR_Parcels/FeatureServer/0/query",
  page: null,
  label: "Sonoma County parcels",
};
const LISTING: SourceRef = {
  type: "listing",
  url: null,
  page: null,
  label: "Listing snapshot",
};

function field(
  propertyId: string,
  key: SpecFieldKey,
  value: FieldValue,
  status: FieldStatus,
  source: SourceRef | null,
  note: string | null = null,
): SpecField {
  return { propertyId, key, value, status, source, confidence: null, note };
}

export const FIXTURE_PROGRAM = {
  footprintSqFt: 2155,
  deckSqFt: 400,
  heightFt: 20,
  stories: 2,
} as const satisfies HouseProgram;

export const FIXTURE_PROPERTIES = [
  {
    id: "fx-sea-gate",
    apn: null,
    address: "35427 Sea Gate Rd, The Sea Ranch, CA",
    sourceUrl: "https://example.invalid/fixture/sea-gate",
    priceUsd: 345000,
    acres: 0.51,
    snapshotAt: "2026-10-03T12:00:00Z",
    isFixture: true,
  },
  {
    id: "fx-shepherds",
    apn: null,
    address: "135 Shepherds Close, The Sea Ranch, CA",
    sourceUrl: "https://example.invalid/fixture/shepherds",
    priceUsd: 189000,
    acres: 0.45,
    snapshotAt: "2026-10-03T12:00:00Z",
    isFixture: true,
  },
  {
    id: "fx-greencroft",
    apn: null,
    address: "36964 Greencroft, The Sea Ranch, CA",
    sourceUrl: "https://example.invalid/fixture/greencroft",
    priceUsd: 297000,
    acres: 1.1,
    snapshotAt: "2026-10-03T12:00:00Z",
    isFixture: true,
  },
] as const satisfies readonly Property[];

export const FIXTURE_FIELDS: readonly SpecField[] = [
  // Lot A: everything known except water -> overall unknown
  field("fx-sea-gate", "hwy1_side", "west", "known", LISTING),
  field("fx-sea-gate", "height_limit_ft", 24, "known", MANUAL),
  field("fx-sea-gate", "lot_coverage_max_pct", 35, "known", MANUAL),
  field("fx-sea-gate", "setback_front_ft", 20, "known", MANUAL),
  field("fx-sea-gate", "fire_hazard_zone", "High", "known", GIS),
  field("fx-sea-gate", "septic_status", "approved", "known", LISTING),
  field("fx-sea-gate", "water_status", null, "unknown", LISTING, "Listing says \"all utilities available\" without naming a water source"),
  field("fx-sea-gate", "design_committee_status", "final approval", "known", LISTING),
  // Lot B: septic unknown, flood undetermined
  field("fx-shepherds", "hwy1_side", "west", "known", LISTING),
  field("fx-shepherds", "height_limit_ft", 24, "known", LISTING),
  field("fx-shepherds", "lot_coverage_max_pct", 35, "known", MANUAL),
  field("fx-shepherds", "septic_status", null, "unknown", LISTING, "No septic information in the listing"),
  field("fx-shepherds", "flood_zone", null, "unknown", GIS, "FEMA zone D: flood hazard undetermined"),
  // Lot C: tract map caps height at 16 ft -> fails a 20 ft house
  field("fx-greencroft", "hwy1_side", "west", "known", LISTING),
  field("fx-greencroft", "height_limit_ft", 24, "known", MANUAL),
  field("fx-greencroft", "tract_map_height_cap_ft", 16, "known", MANUAL, "Recorded tract map caps height at 16 ft"),
  field("fx-greencroft", "lot_coverage_max_pct", 35, "known", MANUAL),
  field("fx-greencroft", "septic_status", "unknown", "unknown", LISTING, "Preliminary plans approved; septic not mentioned"),
];

export const FIXTURE_QUESTIONS: readonly Question[] = [
  {
    id: "fx-q-water",
    propertyId: "fx-sea-gate",
    fieldKey: "water_status",
    text: "Is the lot connected to the Sea Ranch Water Company, or does it need a well?",
    status: "open",
    answer: null,
    answeredAt: null,
  },
  {
    id: "fx-q-septic",
    propertyId: "fx-shepherds",
    fieldKey: "septic_status",
    text: "Has a septic system been permitted for this lot, and for how many bedrooms?",
    status: "open",
    answer: null,
    answeredAt: null,
  },
];

export const FIXTURE_RESULTS: readonly BuildabilityResult[] = [
  {
    propertyId: "fx-sea-gate",
    overall: "unknown",
    unknownCount: 1,
    openQuestionIds: ["fx-q-water"],
    checks: [
      {
        rule: "height",
        label: "Height",
        verdict: "pass",
        detail: "Limit 24 ft west of Hwy 1; your house is 20 ft.",
        required: 24,
        actual: 20,
        sources: [MANUAL],
        questionId: null,
      },
      {
        rule: "lot_coverage",
        label: "Lot coverage",
        verdict: "pass",
        detail: "Footprint plus decks 2,555 sq ft of 7,776 sq ft allowed (35% of 0.51 ac).",
        required: 35,
        actual: 11.5,
        sources: [MANUAL],
        questionId: null,
      },
      {
        rule: "water",
        label: "Water",
        verdict: "unknown",
        detail: "Water source not stated in the listing.",
        required: null,
        actual: null,
        sources: [LISTING],
        questionId: "fx-q-water",
      },
    ],
  },
  {
    propertyId: "fx-shepherds",
    overall: "unknown",
    unknownCount: 2,
    openQuestionIds: ["fx-q-septic"],
    checks: [
      {
        rule: "height",
        label: "Height",
        verdict: "pass",
        detail: "Limit 24 ft; your house is 20 ft.",
        required: 24,
        actual: 20,
        sources: [LISTING],
        questionId: null,
      },
      {
        rule: "septic",
        label: "Septic",
        verdict: "unknown",
        detail: "No septic information in the listing.",
        required: null,
        actual: null,
        sources: [LISTING],
        questionId: "fx-q-septic",
      },
      {
        rule: "flood",
        label: "Flood zone",
        verdict: "unknown",
        detail: "FEMA zone D: flood hazard undetermined.",
        required: null,
        actual: null,
        sources: [GIS],
        questionId: null,
      },
    ],
  },
  {
    propertyId: "fx-greencroft",
    overall: "fail",
    unknownCount: 1,
    openQuestionIds: [],
    checks: [
      {
        rule: "height",
        label: "Height",
        verdict: "fail",
        detail: "Limit 16 ft (recorded tract map); your house is 20 ft.",
        required: 16,
        actual: 20,
        sources: [MANUAL],
        questionId: null,
      },
      {
        rule: "septic",
        label: "Septic",
        verdict: "unknown",
        detail: "Septic not mentioned.",
        required: null,
        actual: null,
        sources: [LISTING],
        questionId: null,
      },
    ],
  },
];

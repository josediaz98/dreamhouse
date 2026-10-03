/**
 * Sea Ranch rules seeded from verified text only. Single source for tests and
 * scripts/seed-rules.ts (which upserts into the `rules` table).
 * `page` is the PDF page index of DM_v7.pdf; the manual's own page label is in `label`.
 */
import type { Rule, SourceRef } from "@/lib/contract";

export const JURISDICTION = "The Sea Ranch (Sonoma County, CA)";
const MANUAL_URL = "https://www.tsra.org/wp-content/uploads/2020/06/DM_v7.pdf";

function manual(page: number, label: string): SourceRef {
  return { type: "manual", url: MANUAL_URL, page, label: `Sea Ranch Design Manual (Oct 2013) ${label}` };
}

export const RULE_IDS = {
  heightWest: "sr-height-west-24",
  heightTractMap: "sr-height-tract-map-16",
  heightEast: "sr-height-east-35",
  coverage: "sr-coverage-35",
  setbackSide: "sr-setback-side-5",
  setbackFront: "sr-setback-front-20",
  setbackRear: "sr-setback-rear-20",
  setbackEnv: "sr-setback-env-10",
} as const;

export const SEA_RANCH_RULES = [
  {
    id: RULE_IDS.heightWest,
    jurisdiction: JURISDICTION,
    key: "height",
    operator: "<=",
    value: 24,
    unit: "ft",
    condition: "west of Highway One",
    source: manual(27, "§6.3, p. 6-1; §6.6.3, p. 6-3"),
  },
  {
    id: RULE_IDS.heightTractMap,
    jurisdiction: JURISDICTION,
    key: "height",
    operator: "<=",
    value: 16,
    unit: "ft",
    condition: "west of Highway One, where the recorded tract map specifies 16 ft",
    source: manual(27, "§6.3, p. 6-1; §6.6.3, p. 6-3"),
  },
  {
    id: RULE_IDS.heightEast,
    jurisdiction: JURISDICTION,
    key: "height",
    operator: "<=",
    value: 35,
    unit: "ft",
    condition: "east of Highway One, unless otherwise designated",
    source: manual(27, "§6.3, p. 6-1"),
  },
  {
    id: RULE_IDS.coverage,
    jurisdiction: JURISDICTION,
    key: "lot_coverage",
    operator: "<=",
    value: 35,
    unit: "pct",
    condition: "building footprint including decks, % of lot area (Sonoma County); Bane Bill lots have stricter limits",
    source: manual(28, "§6.4, p. 6-2"),
  },
  {
    id: RULE_IDS.setbackSide,
    jurisdiction: JURISDICTION,
    key: "setbacks",
    operator: ">=",
    value: 5,
    unit: "ft",
    condition: "side yard, lots under 1 acre",
    source: manual(28, "§6.5.1, p. 6-2"),
  },
  {
    id: RULE_IDS.setbackFront,
    jurisdiction: JURISDICTION,
    key: "setbacks",
    operator: ">=",
    value: 20,
    unit: "ft",
    condition: "front yard, lots under 1 acre",
    source: manual(28, "§6.5.1, p. 6-2"),
  },
  {
    id: RULE_IDS.setbackRear,
    jurisdiction: JURISDICTION,
    key: "setbacks",
    operator: ">=",
    value: 20,
    unit: "ft",
    condition: "rear yard, lots under 1 acre",
    source: manual(28, "§6.5.1, p. 6-2"),
  },
  {
    id: RULE_IDS.setbackEnv,
    jurisdiction: JURISDICTION,
    key: "setbacks",
    operator: ">=",
    value: 10,
    unit: "ft",
    condition: "environmental setback from the edge of a wet zone, seep or intermittent seasonal stream channel",
    source: manual(28, "§6.5.2, p. 6-2"),
  },
] as const satisfies readonly Rule[];

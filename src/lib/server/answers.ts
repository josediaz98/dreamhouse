/**
 * Seller answer text -> typed spec value. Deterministic keyword rules (no LLM): a wrong parse
 * would flip a verdict. When nothing matches, the field stays unknown and the text is kept as the note.
 */
import type { FieldValue, SpecFieldKey } from "@/lib/contract";

export interface ParsedAnswer {
  readonly known: boolean;
  readonly value: FieldValue;
}

const UNPARSED: ParsedAnswer = { known: false, value: null };
const known = (value: FieldValue): ParsedAnswer => ({ known: true, value });

export function parseAnswer(key: SpecFieldKey, raw: string): ParsedAnswer {
  const t = raw.toLowerCase();
  switch (key) {
    case "septic_status":
      if (/\b(not|isn't|is not|never)\s+(feasible|approved|permitted)|denied|failed|infeasible/.test(t)) return known("infeasible");
      if (/public sewer|sewer (hookup|connection|at the street)/.test(t)) return known("not_required");
      if (/approved|permitted|permit (issued|granted)/.test(t)) return known("approved");
      if (/installed|existing system/.test(t)) return known("installed");
      return UNPARSED;
    case "water_status":
      if (/\bno water\b|unavailable|not available|none available/.test(t)) return known("unavailable");
      if (/\bwell\b/.test(t) && /approved|drilled|permitted|producing/.test(t)) return known("well_approved");
      if (/connected|hook ?up|\btap\b|meter|public water|water company|available at the street/.test(t)) return known("connected");
      if (/installed/.test(t)) return known("installed");
      return UNPARSED;
    case "tract_map_height_cap_ft": {
      const n = /(\d{2})\s*(ft|feet|foot|')/.exec(t);
      if (n?.[1]) return known(Number(n[1]) >= 24 ? null : Number(n[1]));
      if (/\bno (cap|limit|restriction)|\bnone\b|not (capped|restricted)/.test(t)) return known(null);
      return UNPARSED;
    }
    case "hwy1_side": {
      const west = /\bwest\b/.test(t);
      const east = /\beast\b/.test(t);
      return west !== east ? known(west ? "west" : "east") : UNPARSED;
    }
    case "acres": {
      const n = /(\d+(?:\.\d+)?)\s*(acres?|ac)\b/.exec(t);
      return n?.[1] ? known(Number(n[1])) : UNPARSED;
    }
    case "flood_zone": {
      if (/outside (of )?(the )?(special )?flood/.test(t)) return known("X");
      const z = /zone\s+([a-z]{1,2})\b/i.exec(raw);
      return z?.[1] ? known(z[1].toUpperCase()) : UNPARSED;
    }
    case "design_committee_status":
      return raw.trim() === "" ? UNPARSED : known(raw.trim().slice(0, 120));
    default:
      return UNPARSED;
  }
}

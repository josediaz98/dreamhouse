/** The four tools, written once. REST routes and the MCP server both call runTool. */
import { z } from "zod";
import {
  MCP_TOOLS,
  SPEC_FIELD_KEYS,
  type CheckBuildabilityOutput,
  type GetSpecOutput,
  type McpToolIO,
  type McpToolName,
  type SearchItem,
  type SearchPropertiesOutput,
  type SpecField,
  type Verdict,
} from "@/lib/contract";
import { checkBuildability } from "@/lib/server/buildability";
import { NotFoundError, type Repo } from "@/lib/server/repo";

export const HouseProgramSchema = z.object({
  footprintSqFt: z.number().positive(),
  deckSqFt: z.number().min(0),
  heightFt: z.number().positive(),
  stories: z.number().int().min(1),
});

const FieldKeySchema = z.enum(SPEC_FIELD_KEYS);

export const TOOL_SCHEMAS = {
  search_properties: z.object({
    maxPriceUsd: z.number().positive().optional(),
    minAcres: z.number().min(0).optional(),
    maxAcres: z.number().positive().optional(),
    program: HouseProgramSchema.optional(),
  }),
  get_spec: z.object({ propertyId: z.string().min(1) }),
  check_buildability: z.object({ propertyId: z.string().min(1), program: HouseProgramSchema }),
  ask_seller: z.object({ propertyId: z.string().min(1), fieldKey: FieldKeySchema, text: z.string().trim().min(3).max(500) }),
} as const satisfies Record<McpToolName, z.ZodType>;

export const TOOL_DESCRIPTIONS: Record<McpToolName, string> = {
  search_properties:
    "List Sea Ranch lots with how many spec fields are known vs unknown. With `program`, each lot also carries a deterministic buildability verdict and `eliminatedCount` counts lots ruled out by a failing rule.",
  get_spec: "All spec fields of one lot, each with its source, confidence and status (known / unknown / conflict).",
  check_buildability:
    "Per-rule pass / fail / unknown for a house program on one lot, each check with its sources. Deterministic: computed from the rules table, never by an LLM. Checks: height, lot coverage, septic, water, flood. Setbacks are NOT evaluated (no lot dimensions): never report a setback pass.",
  ask_seller: "Ask the seller to resolve an unknown field. Returns the question; the answer re-ranks the lot live.",
};

export function isToolName(s: string): s is McpToolName {
  return (MCP_TOOLS as readonly string[]).includes(s);
}

const ORDER: Record<Verdict, number> = { pass: 0, unknown: 1, fail: 2 };

function counts(fields: readonly SpecField[]): { known: number; unknown: number } {
  const known = new Set(fields.filter((f) => f.status === "known").map((f) => f.key)).size;
  return { known, unknown: SPEC_FIELD_KEYS.length - known };
}

async function search(repo: Repo, input: McpToolIO["search_properties"]["input"]): Promise<SearchPropertiesOutput> {
  const [props, byProperty, rules, questions] = await Promise.all([repo.listProperties(), repo.allFields(), repo.rules(), repo.listQuestions({})]);
  const items: SearchItem[] = [];
  for (const p of props) {
    if (p.isFixture) continue;
    if (input.maxPriceUsd !== undefined && (p.priceUsd === null || p.priceUsd > input.maxPriceUsd)) continue;
    if (input.minAcres !== undefined && (p.acres === null || p.acres < input.minAcres)) continue;
    if (input.maxAcres !== undefined && (p.acres === null || p.acres > input.maxAcres)) continue;
    const fields = byProperty.get(p.id) ?? [];
    const c = counts(fields);
    const overall = input.program ? checkBuildability(p.id, fields, rules, input.program, questions).overall : null;
    items.push({ property: p, knownCount: c.known, unknownCount: c.unknown, overall });
  }
  items.sort(
    (a, b) =>
      ORDER[a.overall ?? "unknown"] - ORDER[b.overall ?? "unknown"] || a.unknownCount - b.unknownCount || (a.property.priceUsd ?? 0) - (b.property.priceUsd ?? 0),
  );
  return { items, eliminatedCount: items.filter((i) => i.overall === "fail").length };
}

async function getProperty(repo: Repo, id: string) {
  const p = await repo.getProperty(id);
  if (!p) throw new NotFoundError(`property ${id}`);
  return p;
}

export async function runTool<T extends McpToolName>(repo: Repo, tool: T, raw: unknown): Promise<McpToolIO[T]["output"]> {
  // The overloads below return the exact output type per tool; the cast is confined to this boundary.
  const out = await dispatch(repo, tool, raw);
  return out as McpToolIO[T]["output"];
}

async function dispatch(repo: Repo, tool: McpToolName, raw: unknown): Promise<SearchPropertiesOutput | GetSpecOutput | CheckBuildabilityOutput | McpToolIO["ask_seller"]["output"]> {
  switch (tool) {
    case "search_properties":
      return search(repo, TOOL_SCHEMAS.search_properties.parse(raw ?? {}));
    case "get_spec": {
      const { propertyId } = TOOL_SCHEMAS.get_spec.parse(raw);
      const [property, fields] = await Promise.all([getProperty(repo, propertyId), repo.fieldsOf(propertyId)]);
      return { property, fields };
    }
    case "check_buildability": {
      const { propertyId, program } = TOOL_SCHEMAS.check_buildability.parse(raw);
      await getProperty(repo, propertyId);
      const [fields, rules, questions] = await Promise.all([repo.fieldsOf(propertyId), repo.rules(), repo.listQuestions({ propertyId })]);
      return checkBuildability(propertyId, fields, rules, program, questions);
    }
    case "ask_seller": {
      const input = TOOL_SCHEMAS.ask_seller.parse(raw);
      await getProperty(repo, input.propertyId);
      return { question: await repo.createQuestion(input) };
    }
  }
}

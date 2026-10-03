import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { Property, SpecField } from "@/lib/contract";
import { runBuyerAgent, type AgentEvent } from "@/lib/server/agent";
import { memoryRepo } from "@/lib/server/repo-memory";
import { SEA_RANCH_RULES } from "@/lib/server/rules";

const P: Property = { id: "a", apn: null, address: "a", sourceUrl: "https://example.test/a", priceUsd: 1, acres: 0.5, snapshotAt: "2026-10-03T00:00:00Z", isFixture: false };
const src = { type: "listing", url: null, page: null, label: "x" } as const;
const f = (key: SpecField["key"], value: SpecField["value"]): SpecField => ({ propertyId: "a", key, value, status: "known", source: src, confidence: null, note: null });

/** Scripted stand-in for the Anthropic client: replays the given assistant turns. */
function scripted(turns: Anthropic.ContentBlock[][]): Anthropic {
  let i = 0;
  return { messages: { create: async () => ({ content: turns[i++] ?? [] }) } } as unknown as Anthropic;
}

describe("buyer agent", () => {
  it("runs tools, traces them, and ends with Claude's text", async () => {
    const repo = memoryRepo({
      properties: [P],
      rules: [...SEA_RANCH_RULES],
      fields: [f("hwy1_side", "west"), f("tract_map_height_cap_ft", 16), f("acres", 0.5), f("septic_status", "approved"), f("water_status", "connected"), f("flood_zone", "X")],
    });
    const program = { footprintSqFt: 2155, deckSqFt: 400, heightFt: 20, stories: 2 };
    const client = scripted([
      [{ type: "tool_use", id: "u1", name: "search_properties", input: { program } } as Anthropic.ToolUseBlock],
      [{ type: "tool_use", id: "u2", name: "check_buildability", input: { propertyId: "a", program } } as Anthropic.ToolUseBlock],
      [{ type: "text", text: "Lot a fails: height." } as Anthropic.TextBlock],
    ]);
    const events: AgentEvent[] = [];
    for await (const e of runBuyerAgent(repo, { prompt: "Beach lot" }, client)) events.push(e);

    const traces = events.flatMap((e) => (e.type === "trace" ? [e.event] : []));
    expect(traces.map((t) => `${t.tool}:${t.status}`)).toEqual(["search_properties:running", "search_properties:ok", "check_buildability:running", "check_buildability:fail"]);
    expect(traces[1]?.label).toBe("search_properties → 1 lots, 1 eliminated");
    expect(events.at(-1)).toEqual({ type: "final", text: "Lot a fails: height." });
    expect((await repo.listCalls(10)).map((c) => c.tool)).toEqual(["check_buildability", "search_properties"]);
  });
});

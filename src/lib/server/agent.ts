/**
 * Buyer agent: Claude with the four tools, run in-process (same functions the MCP server exposes).
 * Emits TraceEvents for the Front's trace panel. Claude never decides a verdict: it reports the tool output.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MCP_TOOLS, type McpToolName, type TraceEvent, type TraceStatus } from "@/lib/contract";
import { EXTRACTION_MODEL } from "@/lib/server/ingest";
import type { Repo } from "@/lib/server/repo";
import { runTool, TOOL_DESCRIPTIONS, TOOL_SCHEMAS } from "@/lib/server/tools";

const SYSTEM = `You are a buyer's agent helping someone buy a coastal lot at The Sea Ranch (Sonoma County, CA) and build a custom house.
Use the tools; do not answer from memory. Budget: at most 12 tool calls in total.
1. Call search_properties once with the house program. It already returns a verdict for every lot and eliminatedCount. State how many lots were ruled out.
2. Call check_buildability only for the 2 best lots that are not ruled out, to read their checks and sources. Skip lots that failed.
3. Verdicts (pass / fail / unknown) come only from the tools. Never decide, soften or override one.
4. Seller questions for septic, water and flood are usually open already: a check with an unknown verdict and a questionId has one. Never call ask_seller for a field that has an open question. Call ask_seller only for an unknown check whose questionId is null, at most 3 times per run.
5. Then stop calling tools and write the ranking: lot, verdict, the rules that fail or are unknown, the source label of each, and which seller answers would unlock the best lot.
Setbacks are not evaluated by any tool: say so if asked, and never claim a setback pass.
No marketing language. No numbers that did not come from a tool.`;

const MAX_ASK_SELLER = 3;
const MAX_TOOL_CALLS = 12;

export interface AgentInput {
  readonly prompt: string;
  readonly maxTurns?: number;
}

export type AgentEvent = { readonly type: "trace"; readonly event: TraceEvent } | { readonly type: "final"; readonly text: string } | { readonly type: "error"; readonly message: string };

function statusOf(tool: McpToolName, output: unknown): TraceStatus {
  if (tool === "ask_seller") return "unknown";
  const overall = typeof output === "object" && output !== null && "overall" in output ? (output as { overall: unknown }).overall : null;
  return overall === "fail" ? "fail" : overall === "unknown" ? "unknown" : "ok";
}

function labelOf(tool: McpToolName, input: unknown, output?: unknown): string {
  const o = (typeof output === "object" && output !== null ? output : {}) as Record<string, unknown>;
  const i = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  switch (tool) {
    case "search_properties":
      return output === undefined ? "search_properties" : `search_properties → ${(o.items as unknown[] | undefined)?.length ?? 0} lots, ${String(o.eliminatedCount ?? 0)} eliminated`;
    case "check_buildability":
      return output === undefined ? "check_buildability" : `check_buildability ${String(i.propertyId)} → ${String(o.overall)}`;
    case "get_spec":
      return `get_spec ${String(i.propertyId)}`;
    case "ask_seller":
      return `ask_seller ${String(i.propertyId)}.${String(i.fieldKey)} → question drafted`;
  }
}

/** Reasons ask_seller must not run: an open question already exists for the field, or the per-run cap is hit. */
async function askSellerRefusal(repo: Repo, input: unknown, asked: number): Promise<string | null> {
  if (asked >= MAX_ASK_SELLER) return `ask_seller limit (${MAX_ASK_SELLER}) reached. Write the final ranking now.`;
  const parsed = TOOL_SCHEMAS.ask_seller.safeParse(input);
  if (!parsed.success) return null; // runTool reports the validation error
  const open = await repo.listQuestions({ propertyId: parsed.data.propertyId, status: "open" });
  const existing = open.find((q) => q.fieldKey === parsed.data.fieldKey);
  return existing ? `A question for ${parsed.data.fieldKey} is already open (id ${existing.id}). Do not ask again.` : null;
}

export async function* runBuyerAgent(repo: Repo, input: AgentInput, client: Anthropic = new Anthropic()): AsyncGenerator<AgentEvent> {
  const tools: Anthropic.Tool[] = MCP_TOOLS.map((name) => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    input_schema: z.toJSONSchema(TOOL_SCHEMAS[name]) as Anthropic.Tool.InputSchema,
  }));
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: input.prompt }];
  let n = 0;
  let calls = 0;
  let asks = 0;

  for (let turn = 0; turn < (input.maxTurns ?? 8); turn++) {
    const res = await client.messages.create({ model: EXTRACTION_MODEL, max_tokens: 2000, system: SYSTEM, tools, messages });
    messages.push({ role: "assistant", content: res.content });
    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (uses.length === 0) {
      yield { type: "final", text: res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n") };
      return;
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of uses) {
      const tool = use.name as McpToolName;
      const id = `t${++n}`;
      if (!(MCP_TOOLS as readonly string[]).includes(tool)) {
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: `unknown tool ${use.name}` });
        continue;
      }
      if (calls >= MAX_TOOL_CALLS) {
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: `Tool-call budget (${MAX_TOOL_CALLS}) used. Write the final ranking now.` });
        continue;
      }
      if (tool === "ask_seller") {
        const refusal = await askSellerRefusal(repo, use.input, asks);
        if (refusal !== null) {
          results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: refusal });
          continue;
        }
        asks++;
      }
      calls++;
      yield { type: "trace", event: { id, tool, status: "running", label: labelOf(tool, use.input), ms: null } };
      const t0 = Date.now();
      try {
        const output = await runTool(repo, tool, use.input);
        await repo.logCall({ agentId: "buyer-agent", tool, amountUsd: 0, paymentRef: null });
        yield { type: "trace", event: { id, tool, status: statusOf(tool, output), label: labelOf(tool, use.input, output), ms: Date.now() - t0 } };
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output) });
      } catch (e) {
        const message = e instanceof Error ? e.message : "tool failed";
        yield { type: "trace", event: { id, tool, status: "fail", label: `${tool}: ${message}`, ms: Date.now() - t0 } };
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: message });
      }
    }
    messages.push({ role: "user", content: results });
  }
  yield { type: "error", message: "agent stopped: turn limit reached" };
}

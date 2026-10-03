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
Use the tools; do not answer from memory.
1. search_properties with the house program to rank lots. Mention how many lots were ruled out (eliminatedCount).
2. check_buildability on the best candidates.
3. Verdicts (pass / fail / unknown) come only from the tools. Never decide, soften or override one.
4. For each unknown that blocks a lot, call ask_seller once with a specific question for that field, then say what the seller must answer.
5. Finish with a short ranked summary: lot, verdict, the rules that fail or are unknown, with the source label of each.
Setbacks are not evaluated by any tool: say so if asked, and never claim a setback pass.\nNo marketing language. No numbers that did not come from a tool.`;

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

export async function* runBuyerAgent(repo: Repo, input: AgentInput, client: Anthropic = new Anthropic()): AsyncGenerator<AgentEvent> {
  const tools: Anthropic.Tool[] = MCP_TOOLS.map((name) => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    input_schema: z.toJSONSchema(TOOL_SCHEMAS[name]) as Anthropic.Tool.InputSchema,
  }));
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: input.prompt }];
  let n = 0;

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

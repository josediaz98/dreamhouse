import { MCP_TOOLS } from "@/lib/contract";
import { agentId, errorResponse, getRepo } from "@/lib/server/http";
import { meterToolCall } from "@/lib/server/stripe-metering";
import { charge, paymentRef, paywallEnabled, TOOL_PRICES_USD } from "@/lib/server/paywall";
import { isToolName, runTool, TOOL_SCHEMAS } from "@/lib/server/tools";

export const maxDuration = 30;

/** POST body = McpToolIO[tool]["input"]; response = McpToolIO[tool]["output"]. Priced tools answer HTTP 402 until paid. */
export async function POST(request: Request, ctx: RouteContext<"/api/tools/[tool]">): Promise<Response> {
  try {
    const { tool } = await ctx.params;
    if (!isToolName(tool)) return Response.json({ error: "unknown_tool", tools: MCP_TOOLS }, { status: 404 });

    const text = await request.clone().text();
    let body: unknown = {};
    if (text.trim() !== "") {
      try {
        body = JSON.parse(text);
      } catch {
        return Response.json({ error: "invalid_json" }, { status: 400 });
      }
    }
    TOOL_SCHEMAS[tool].parse(body); // validate before charging

    const price = TOOL_PRICES_USD[tool];
    const gated = price !== undefined && paywallEnabled() ? await charge(request, price) : null;
    if (gated && !gated.paid) return gated.challenge;

    const output = await runTool(getRepo(), tool, body);
    const res = gated ? gated.withReceipt(Response.json(output)) : Response.json(output);
    await getRepo().logCall({ agentId: agentId(request), tool, amountUsd: gated ? Number(price) : 0, paymentRef: gated ? paymentRef(res) : null });
    meterToolCall(tool);
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}

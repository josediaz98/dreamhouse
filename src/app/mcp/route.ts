import { createMcpHandler } from "mcp-handler";
import { MCP_TOOLS } from "@/lib/contract";
import { getRepo } from "@/lib/server/http";
import { runTool, TOOL_DESCRIPTIONS, TOOL_SCHEMAS } from "@/lib/server/tools";

export const maxDuration = 30;

/**
 * MCP over Streamable HTTP. Same tool functions as the REST routes. Payment is enforced on the REST
 * surface (HTTP 402); MCP calls are logged to `calls` as free.
 */
const handler = createMcpHandler(
  (server) => {
    for (const tool of MCP_TOOLS) {
      server.registerTool(tool, { description: TOOL_DESCRIPTIONS[tool], inputSchema: TOOL_SCHEMAS[tool] }, async (input: unknown) => {
        try {
          const output = await runTool(getRepo(), tool, input);
          await getRepo().logCall({ agentId: "mcp-client", tool, amountUsd: 0, paymentRef: null });
          return { content: [{ type: "text" as const, text: JSON.stringify(output) }] };
        } catch (e) {
          return { isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : "tool failed" }] };
        }
      });
    }
  },
  { serverInfo: { name: "dreamhouse", version: "0.1.0" } },
);

export { handler as GET, handler as POST };

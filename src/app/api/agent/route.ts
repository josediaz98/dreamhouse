import { z } from "zod";
import { runBuyerAgent } from "@/lib/server/agent";
import { errorResponse, getRepo } from "@/lib/server/http";

export const maxDuration = 60;

const Body = z.object({ prompt: z.string().trim().min(5).max(1000) });

/** POST { prompt } -> NDJSON stream of { type: "trace", event: TraceEvent } ... { type: "final", text }. */
export async function POST(request: Request): Promise<Response> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "not_configured", detail: "ANTHROPIC_API_KEY is not set" }, { status: 503 });
    const { prompt } = Body.parse(await request.json().catch(() => ({})));
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const ev of runBuyerAgent(getRepo(), { prompt })) controller.enqueue(enc.encode(`${JSON.stringify(ev)}\n`));
        } catch (e) {
          console.error(e);
          controller.enqueue(enc.encode(`${JSON.stringify({ type: "error", message: "agent failed" })}\n`));
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

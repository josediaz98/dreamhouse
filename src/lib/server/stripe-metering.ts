/**
 * Stripe Billing meter events for priced tool calls (sandbox usage metering; independent of the MPP paywall).
 * One event per successful get_spec / check_buildability call, only when both STRIPE_SECRET_KEY and
 * STRIPE_METER_CUSTOMER_ID are set. Fire and forget: a missing key, a failure or a timeout never changes
 * the response and never adds latency (the send runs after the response). Failures are logged without key material.
 */
import { after } from "next/server";
import StripeClient from "stripe";
import type { McpToolName } from "@/lib/contract";

export const METER_EVENT_NAME = "lotline_tool_call";
/** Must match the priced tools in paywall.ts (a test keeps them in sync). */
export const METERED_TOOLS = ["get_spec", "check_buildability"] as const satisfies readonly McpToolName[];
const TIMEOUT_MS = 2_500;

export interface MeterClient {
  readonly billing: {
    readonly meterEvents: {
      create(params: { event_name: string; payload: Record<string, string> }): Promise<unknown>;
    };
  };
}

export interface MeteringDeps {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly client?: MeterClient;
  readonly warn?: (message: string) => void;
  readonly timeoutMs?: number;
}

export function isMeteredTool(tool: string): tool is (typeof METERED_TOOLS)[number] {
  return (METERED_TOOLS as readonly string[]).includes(tool);
}

let cached: { readonly secret: string; readonly client: MeterClient } | null = null;
function clientFor(secret: string): MeterClient {
  if (cached?.secret !== secret) cached = { secret, client: new StripeClient(secret, { timeout: TIMEOUT_MS, maxNetworkRetries: 0 }) as unknown as MeterClient };
  return cached.client;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** Error class and code only: Stripe error messages can echo part of the API key. */
function describe(e: unknown): string {
  if (typeof e !== "object" || e === null) return "unknown error";
  const { type, code, name } = e as { type?: unknown; code?: unknown; name?: unknown };
  return [type, code, name].filter((v): v is string => typeof v === "string").join("/") || "unknown error";
}

/** Sends one meter event. Resolves true when sent; never throws. */
export async function sendMeterEvent(tool: McpToolName, deps: MeteringDeps = {}): Promise<boolean> {
  if (!isMeteredTool(tool)) return false;
  const env = deps.env ?? process.env;
  const secret = env.STRIPE_SECRET_KEY;
  const customer = env.STRIPE_METER_CUSTOMER_ID;
  if (!secret || !customer) return false;
  try {
    const client = deps.client ?? clientFor(secret);
    await withTimeout(client.billing.meterEvents.create({ event_name: METER_EVENT_NAME, payload: { stripe_customer_id: customer, value: "1" } }), deps.timeoutMs ?? TIMEOUT_MS);
    return true;
  } catch (e) {
    (deps.warn ?? console.warn)(`stripe metering failed for ${tool}: ${describe(e)}`);
    return false;
  }
}

/** Call once after a successful tool call. Returns immediately; the event is sent after the response. */
export function meterToolCall(tool: McpToolName): void {
  if (!isMeteredTool(tool) || !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_METER_CUSTOMER_ID) return;
  const job = () => sendMeterEvent(tool);
  try {
    after(job);
  } catch {
    void job(); // not inside a request scope (scripts, tests)
  }
}

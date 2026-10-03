import { describe, expect, it } from "vitest";
import { MCP_TOOLS } from "@/lib/contract";
import { TOOL_PRICES_USD } from "@/lib/server/paywall";
import { METERED_TOOLS, sendMeterEvent, type MeterClient } from "@/lib/server/stripe-metering";

const ENV = { STRIPE_SECRET_KEY: "sk_test_secret_value", STRIPE_METER_CUSTOMER_ID: "cus_test_123" };

function stub(behaviour: "ok" | "throw" | "hang" = "ok") {
  const calls: { event_name: string; payload: Record<string, string> }[] = [];
  const client: MeterClient = {
    billing: {
      meterEvents: {
        create: (params) => {
          calls.push(params);
          if (behaviour === "throw") return Promise.reject(Object.assign(new Error("Invalid API Key provided: sk_test_secret_value"), { type: "StripeAuthenticationError", code: "api_key_invalid" }));
          if (behaviour === "hang") return new Promise(() => {});
          return Promise.resolve({});
        },
      },
    },
  };
  return { client, calls };
}

describe("stripe metering", () => {
  it("sends one meter event for a priced tool when both vars are set", async () => {
    const { client, calls } = stub();
    expect(await sendMeterEvent("check_buildability", { env: ENV, client })).toBe(true);
    expect(calls).toEqual([{ event_name: "lotline_tool_call", payload: { stripe_customer_id: "cus_test_123", value: "1" } }]);
  });

  it("does nothing when either var is missing", async () => {
    const { client, calls } = stub();
    expect(await sendMeterEvent("get_spec", { env: { STRIPE_METER_CUSTOMER_ID: "cus_test_123" }, client })).toBe(false);
    expect(await sendMeterEvent("get_spec", { env: { STRIPE_SECRET_KEY: "sk_test_x" }, client })).toBe(false);
    expect(await sendMeterEvent("get_spec", { env: {}, client })).toBe(false);
    expect(calls).toEqual([]);
  });

  it("does nothing for free tools", async () => {
    const { client, calls } = stub();
    for (const tool of MCP_TOOLS.filter((t) => !(METERED_TOOLS as readonly string[]).includes(t))) expect(await sendMeterEvent(tool, { env: ENV, client })).toBe(false);
    expect(calls).toEqual([]);
  });

  it("swallows errors and logs class and code only, never the message or the key", async () => {
    const { client } = stub("throw");
    const logs: string[] = [];
    expect(await sendMeterEvent("get_spec", { env: ENV, client, warn: (m) => logs.push(m) })).toBe(false);
    expect(logs).toEqual(["stripe metering failed for get_spec: StripeAuthenticationError/api_key_invalid/Error"]);
    expect(logs.join()).not.toContain("sk_test_secret_value");
  });

  it("gives up after the timeout instead of hanging", async () => {
    const { client } = stub("hang");
    const logs: string[] = [];
    expect(await sendMeterEvent("get_spec", { env: ENV, client, timeoutMs: 20, warn: (m) => logs.push(m) })).toBe(false);
    expect(logs).toHaveLength(1);
  });

  it("meters exactly the tools the paywall prices", () => {
    expect([...METERED_TOOLS].sort()).toEqual(Object.keys(TOOL_PRICES_USD).sort());
  });
});

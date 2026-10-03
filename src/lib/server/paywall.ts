/**
 * Pay-per-call via Stripe Machine Payments Protocol (sandbox when STRIPE_SECRET_KEY is a test key).
 * Without STRIPE_SECRET_KEY + STRIPE_PROFILE_ID the paywall is off and calls are logged as free.
 */
import crypto from "node:crypto";
import { Receipt } from "mppx";
import { Mppx, Store, stripe } from "mppx/server";
import StripeClient from "stripe";
import type { McpToolName } from "@/lib/contract";

/** USD per call. 0.50 is the card (SPT) minimum. */
export const TOOL_PRICES_USD: Partial<Record<McpToolName, string>> = {
  get_spec: "0.50",
  check_buildability: "0.50",
};

export function paywallEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PROFILE_ID);
}

/** Per-instance replay protection: enough for a sandbox demo, swap for redis/upstash before real money. */
const MEMORY_STORE = Store.memory();

function build() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const profile = process.env.STRIPE_PROFILE_ID;
  if (!secret || !profile) throw new Error("paywall not configured");
  const methods = stripe.create({ client: new StripeClient(secret), networkId: profile, livemode: !secret.includes("_test_"), store: MEMORY_STORE });
  return Mppx.create({
    methods: methods.defaultMethods(),
    secretKey: crypto.createHmac("sha256", secret).update("mpp-challenge-signing").digest("base64"),
  });
}

let mppx: ReturnType<typeof build> | null = null;

export type ChargeResult =
  | { readonly paid: false; readonly challenge: Response }
  | { readonly paid: true; readonly withReceipt: (res: Response) => Response };

export async function charge(request: Request, amountUsd: string): Promise<ChargeResult> {
  mppx ??= build();
  const result = await mppx.charge({ amount: amountUsd })(request);
  if (result.status === 402) return { paid: false, challenge: result.challenge };
  return { paid: true, withReceipt: (res) => result.withReceipt(res) };
}

/** The payment reference from a response's Payment-Receipt header, or null. */
export function paymentRef(res: Response): string | null {
  const header = res.headers.get("Payment-Receipt");
  if (!header) return null;
  try {
    return Receipt.deserialize(header).reference;
  } catch {
    return null;
  }
}

import type { Property, Verdict } from "@/lib/contract";

export function formatUsd(value: number | null): string {
  if (value === null) return "n/a";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Sub-dollar call prices need more digits than lot prices. */
export function formatCallUsd(value: number): string {
  return `$${value.toFixed(3)}`;
}

export function formatMs(ms: number | null): string {
  if (ms === null) return "…";
  return ms < 1 ? "<1 ms" : `${Math.round(ms)} ms`;
}

export function streetOf(property: Pick<Property, "address">): string {
  return property.address.split(",")[0] ?? property.address;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  pass: "Pass",
  fail: "Fail",
  unknown: "Unknown",
};

export const VERDICT_GLYPH: Record<Verdict, string> = {
  pass: "✓",
  fail: "✕",
  unknown: "?",
};

/** Sort key: buildable first, unknown next, ruled-out last. */
export const VERDICT_RANK: Record<Verdict, number> = { pass: 0, unknown: 1, fail: 2 };

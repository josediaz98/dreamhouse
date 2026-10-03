import type { Verdict } from "@/lib/contract";
import { VERDICT_GLYPH, VERDICT_LABEL } from "@/lib/client/format";

const TONE: Record<Verdict, string> = {
  pass: "border text-pass border-pass-line bg-pass-soft",
  fail: "border text-fail border-fail-line bg-fail-soft",
  unknown: "text-unknown unknown-edge bg-unknown-soft",
};

export function VerdictBadge({ verdict }: { readonly verdict: Verdict }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs font-medium ${TONE[verdict]}`}
    >
      <span aria-hidden>{VERDICT_GLYPH[verdict]}</span>
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

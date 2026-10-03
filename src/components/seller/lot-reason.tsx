import type { BuildabilityResult } from "@/lib/contract";
import { plural } from "@/components/seller/use-seller-data";

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** The one reason line used on the landing cards. */
export function LotReason({
  result,
  className = "text-sm",
}: {
  readonly result: BuildabilityResult | null;
  readonly className?: string;
}) {
  if (!result) return <p className={`${className} text-muted`}>Checking the rules…</p>;
  if (result.overall === "fail") {
    const failing = result.checks.find((c) => c.verdict === "fail");
    return (
      <p className={`${className} text-muted`}>
        <span className="text-fail">Ruled out:</span>{" "}
        {failing ? lowerFirst(failing.detail).replace(/\.$/, "") : "a hard rule fails"}
      </p>
    );
  }
  if (result.overall === "unknown") {
    const unknown = result.checks.filter((c) => c.verdict === "unknown");
    return (
      <p className={`${className} text-muted`}>
        <span className="text-unknown">{plural(unknown.length, "unknown")}:</span>{" "}
        {unknown.map((c) => c.label.toLowerCase()).join(", ")}
      </p>
    );
  }
  return <p className={`${className} text-pass`}>Passes every rule we can check</p>;
}

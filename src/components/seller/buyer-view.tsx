"use client";

import type { BuildabilityResult, Verdict } from "@/lib/contract";
import { formatAcres, formatUsd, streetOf, VERDICT_RANK } from "@/lib/client/format";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import type { LotChange, LotView, LotsState } from "@/lib/client/use-lots";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";
import { LotAerial } from "@/components/lot-aerial";
import { VerdictBadge } from "@/components/verdict-badge";

function verdictOf(lot: LotView): Verdict {
  return lot.result?.overall ?? lot.item.overall ?? "unknown";
}

function unknownsOf(lot: LotView): number {
  return lot.result?.unknownCount ?? lot.item.unknownCount;
}

/** Pass first, then unknown (fewest unknown rules first), then ruled out. Same order as the landing. */
function sortLots(lots: readonly LotView[]): LotView[] {
  return [...lots].sort((a, b) => {
    const byVerdict = VERDICT_RANK[verdictOf(a)] - VERDICT_RANK[verdictOf(b)];
    return byVerdict !== 0 ? byVerdict : unknownsOf(a) - unknownsOf(b);
  });
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function Reason({ result }: { readonly result: BuildabilityResult | null }) {
  if (!result) return <p className="text-sm text-muted">Checking the rules…</p>;
  if (result.overall === "fail") {
    const failing = result.checks.find((c) => c.verdict === "fail");
    return (
      <p className="text-sm text-muted">
        <span className="text-fail">Ruled out:</span>{" "}
        {failing ? lowerFirst(failing.detail).replace(/\.$/, "") : "a hard rule fails"}
      </p>
    );
  }
  if (result.overall === "unknown") {
    const unknown = result.checks.filter((c) => c.verdict === "unknown");
    return (
      <p className="text-sm text-muted">
        <span className="text-unknown">{plural(unknown.length, "unknown")}:</span>{" "}
        {unknown.map((c) => c.label.toLowerCase()).join(", ")}
      </p>
    );
  }
  return <p className="text-sm text-pass">Passes every rule we can check</p>;
}

function changeText(change: LotChange): string {
  if (change.from !== change.to) return `${change.from ?? "new"} → ${change.to ?? "n/a"}`;
  return `${change.unknownFrom} → ${change.unknownTo} unknown`;
}

function BuyerCard({ lot, change }: { readonly lot: LotView; readonly change: LotChange | undefined }) {
  const { property } = lot.item;
  const verdict = verdictOf(lot);
  const ruledOut = verdict === "fail";
  const street = streetOf(property);

  return (
    <li
      className={`flex items-center gap-4 rounded-lg border bg-surface p-3 transition-colors duration-200 sm:p-4 ${
        change ? "row-flash border-accent" : "border-line"
      } ${ruledOut && !change ? "opacity-60" : ""}`}
    >
      <LotAerial
        propertyId={property.id}
        address={street}
        verdict={verdict}
        variant="thumb"
        className="aspect-[3/2] w-20 shrink-0 rounded-md sm:w-24"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <VerdictBadge verdict={verdict} />
          {change ? (
            <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[0.6875rem] font-semibold leading-4 text-accent-ink">
              Seller answered
            </span>
          ) : null}
          {property.isFixture ? <DemoBadge /> : null}
        </div>
        <span className="break-words text-base font-medium text-fg">{street}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {formatUsd(property.priceUsd)} · {formatAcres(property.acres)}
          {change ? <span className="text-accent"> · {changeText(change)}</span> : null}
        </span>
        <Reason result={lot.result} />
      </div>
    </li>
  );
}

export function BuyerView({ state }: { readonly state: LotsState }) {
  const { lots, status, error, changes, refresh, eliminatedCount } = state;
  const sorted = sortLots(lots);
  const openCount = new Set(lots.flatMap(({ result }) => result?.openQuestionIds ?? [])).size;

  return (
    <section aria-labelledby="buyer-heading" className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 id="buyer-heading" className="text-xl text-fg sm:text-2xl">
          Buyer&apos;s agent view
        </h2>
        <p className="mt-1 text-sm text-muted">
          {status === "ready" ? (
            <>
              Ranked for a {DEFAULT_PROGRAM.heightFt} ft, {DEFAULT_PROGRAM.stories}-story house.{" "}
              {eliminatedCount} ruled out, {openCount} open {openCount === 1 ? "question" : "questions"}.
            </>
          ) : (
            `Ranking lots for a ${DEFAULT_PROGRAM.heightFt} ft, ${DEFAULT_PROGRAM.stories}-story house…`
          )}
        </p>
      </div>

      {status === "error" && error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {status === "loading" && lots.length === 0 ? (
        <ul aria-label="Loading lots" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} aria-hidden className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
              <span className="aspect-[3/2] w-24 animate-pulse rounded-md bg-raised" />
              <span className="flex flex-1 flex-col gap-2">
                <span className="h-4 w-1/2 animate-pulse rounded bg-raised" />
                <span className="h-3 w-3/4 animate-pulse rounded bg-raised" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {status === "ready" && lots.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">No lots indexed yet.</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {sorted.map((lot) => {
          const id = lot.item.property.id;
          const change = changes.get(id);
          return (
            <BuyerCard
              key={`${id}-${change ? `${change.from}-${change.to}-${change.unknownTo}` : "static"}`}
              lot={lot}
              change={change}
            />
          );
        })}
      </ul>
    </section>
  );
}

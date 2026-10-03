"use client";

import Link from "next/link";
import { useState } from "react";
import { USE_FIXTURES, answerQuestion, listQuestions } from "@/lib/client/api";
import { formatAcres, formatUsd, streetOf } from "@/lib/client/format";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import type { LotsState } from "@/lib/client/use-lots";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";
import { VerdictBadge } from "@/components/verdict-badge";

const SIMULATED_ANSWER_DELAY_MS = 2500;

export function RankedLots({ state, compact = false }: { readonly state: LotsState; readonly compact?: boolean }) {
  const { lots, status, error, changes, refresh, eliminatedCount } = state;
  const [simulating, setSimulating] = useState(false);
  const openCount = new Set(lots.flatMap(({ result }) => result?.openQuestionIds ?? [])).size;

  /** Fixture mode only: stands in for a seller so the re-rank can be seen without a second tab. */
  function simulateSellerAnswer() {
    setSimulating(true);
    window.setTimeout(async () => {
      try {
        const [first] = await listQuestions("open");
        if (first) await answerQuestion(first.id, "Confirmed by seller (simulated)");
      } finally {
        setSimulating(false);
      }
    }, SIMULATED_ANSWER_DELAY_MS);
  }

  return (
    <section aria-labelledby="ranked-heading" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="ranked-heading" className="text-base font-semibold text-fg">
            Buyer&apos;s agent view
          </h3>
          <p className="text-sm text-muted">
            Ranked for a {DEFAULT_PROGRAM.heightFt} ft, {DEFAULT_PROGRAM.stories}-story house.{" "}
            {eliminatedCount} ruled out, {openCount} open {openCount === 1 ? "question" : "questions"}.
          </p>
        </div>
        {USE_FIXTURES && !compact ? (
          <button
            type="button"
            onClick={simulateSellerAnswer}
            disabled={simulating || openCount === 0}
            className="rounded border border-line-strong px-3 py-1.5 text-xs text-fg hover:bg-raised disabled:opacity-50 max-sm:min-h-11"
          >
            {simulating ? "Seller answering…" : "Simulate seller answer"}
          </button>
        ) : null}
      </div>

      {status === "error" && error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {status === "loading" && lots.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">
          Loading lots…
        </p>
      ) : null}
      {status === "ready" && lots.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">
          No lots indexed yet.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {lots.map(({ item, result }) => {
          const change = changes.get(item.property.id);
          const failing = result?.checks.find((c) => c.verdict === "fail");
          const ruledOut = item.overall === "fail";
          return (
            <li
              key={`${item.property.id}-${change ? `${change.from}-${change.to}-${change.unknownTo}` : "static"}`}
              className={`flex flex-col gap-1.5 rounded-lg border bg-surface px-4 py-3 ${
                change ? "row-flash border-accent" : "border-line"
              } ${ruledOut ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 break-words text-sm font-medium text-fg">
                  {streetOf(item.property)}
                </span>
                {item.overall ? <VerdictBadge verdict={item.overall} /> : null}
              </div>
              <p className="font-mono text-xs text-muted">
                {formatUsd(item.property.priceUsd)} · {formatAcres(item.property.acres)} ·{" "}
                {item.knownCount} known / {item.unknownCount} unknown
                {item.property.isFixture ? (
                  <>
                    {" "}
                    <DemoBadge />
                  </>
                ) : null}
              </p>
              {change ? (
                <p className="text-sm font-medium text-fg">
                  Seller answered:{" "}
                  {change.from !== change.to
                    ? `${change.from ?? "new"} → ${change.to ?? "n/a"}`
                    : `${change.unknownFrom} → ${change.unknownTo} unknown`}
                </p>
              ) : null}
              {ruledOut && failing ? (
                <p className="text-sm text-fail">Ruled out: {failing.detail}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!compact && openCount > 0 ? (
        <p className="text-sm text-muted">
          Open questions wait in the{" "}
          <Link href="/seller" className="text-accent underline underline-offset-2 max-sm:inline-block max-sm:py-3">
            seller console
          </Link>
          . An answer re-ranks this list live.
        </p>
      ) : null}
    </section>
  );
}

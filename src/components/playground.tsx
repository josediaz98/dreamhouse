"use client";

import { useImperativeHandle, useState, type FormEvent, type Ref } from "react";
import type { Property } from "@/lib/contract";
import { USE_FIXTURES } from "@/lib/client/api";
import { formatCallUsd, formatMs, median, streetOf } from "@/lib/client/format";
import type { LotView } from "@/lib/client/use-lots";
import { matchLot, useLotCheck } from "@/lib/client/use-lot-check";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";
import { TracePanel } from "@/components/trace-panel";
import { VerdictList } from "@/components/verdict-list";

export interface PlaygroundHandle {
  /** Select a lot by id and run the full check, as if its chip was clicked. */
  readonly runLot: (propertyId: string) => void;
}

interface PlaygroundProps {
  readonly lots: readonly LotView[];
  readonly loading: boolean;
  /** True when the lots could not be loaded: the banner below says so, no empty-state text. */
  readonly failed?: boolean;
  readonly ref?: Ref<PlaygroundHandle>;
  /** Called with the id of the lot being checked. */
  readonly onLotChange?: (propertyId: string) => void;
}

export function Playground({ lots, loading, failed = false, ref, onLotChange }: PlaygroundProps) {
  const [query, setQuery] = useState("");
  const check = useLotCheck(lots);
  const { phase, events, questions, summary, result, property, message, lastQuery, timings, medianCost } =
    check;

  const chips = [...lots]
    .sort((a, b) => a.item.property.address.localeCompare(b.item.property.address))
    .slice(0, 3);
  const p50 = median(timings);

  function run(rawQuery: string) {
    const match = matchLot(rawQuery, lots);
    if (match) onLotChange?.(match.item.property.id);
    return check.run(rawQuery, DEFAULT_PROGRAM);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(query);
  }

  function pick(lot: Property) {
    setQuery(lot.address);
    void run(lot.address);
  }

  useImperativeHandle(ref, () => ({
    runLot(propertyId: string) {
      const lot = lots.find(({ item }) => item.property.id === propertyId)?.item.property;
      if (!lot) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById("lot-input")
        ?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      pick(lot);
    },
  }));

  const running = phase === "running";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor="lot-input" className="text-sm font-medium text-fg">
            Lot address or APN
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="lot-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={chips[0] ? streetOf(chips[0].item.property) : "Address or APN"}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={running || loading}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50 max-sm:min-h-11"
            >
              {running ? "Checking…" : "Check buildability"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-label="Preset lots">
            <span className="text-xs text-muted">Presets</span>
            {loading && chips.length === 0 ? (
              <span className="text-xs text-muted">Loading lots…</span>
            ) : null}
            {!loading && !failed && chips.length === 0 ? (
              <span className="text-xs text-muted">No lots indexed yet.</span>
            ) : null}
            {chips.map(({ item }) => (
              <button
                key={item.property.id}
                type="button"
                disabled={running}
                onClick={() => pick(item.property)}
                className="rounded-full border border-line-strong px-3 py-1 text-xs text-fg hover:bg-raised disabled:opacity-50 max-sm:min-h-11"
              >
                {streetOf(item.property)}
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-muted">
            House program: {DEFAULT_PROGRAM.footprintSqFt.toLocaleString("en-US")} sq ft +{" "}
            {DEFAULT_PROGRAM.deckSqFt} sq ft deck · {DEFAULT_PROGRAM.heightFt} ft ·{" "}
            {DEFAULT_PROGRAM.stories} stories
          </p>
        </form>

        {message ? (
          <ErrorBanner
            message={message}
            onRetry={lastQuery === null ? undefined : () => void run(lastQuery)}
          />
        ) : null}

        {result ? (
          <div className="flex flex-col gap-2">
            {property ? (
              <p className="text-sm text-muted">
                {property.address}
                {property.isFixture ? (
                  <>
                    {" "}
                    <DemoBadge />
                  </>
                ) : null}
              </p>
            ) : null}
            <VerdictList result={result} />
          </div>
        ) : null}

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
          <span>p50 latency {p50 === null ? "—" : formatMs(p50)}</span>
          <span>
            cost per paid call {medianCost === null ? "—" : formatCallUsd(medianCost)}
          </span>
          {USE_FIXTURES ? <DemoBadge /> : null}
        </p>
      </div>

      <div className="min-w-0">
        <TracePanel events={events} questions={questions} summary={summary} />
      </div>
    </div>
  );
}

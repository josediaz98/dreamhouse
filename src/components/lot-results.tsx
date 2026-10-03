"use client";

import { useState } from "react";
import type { BuildabilityResult, TraceEvent, Verdict } from "@/lib/contract";
import { formatAcres, formatUsd, streetOf, VERDICT_RANK } from "@/lib/client/format";
import type { LotChange, LotView } from "@/lib/client/use-lots";
import { CopyButton } from "@/components/copy-button";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";
import { LotAerial } from "@/components/lot-aerial";
import { TracePanel, type TraceQuestion } from "@/components/trace-panel";
import { VerdictBadge } from "@/components/verdict-badge";
import { VerdictList } from "@/components/verdict-list";

type ResultsView = "results" | "json";

export type ResultsStatus = "loading" | "ready" | "error" | "empty";

export interface ResultsCard {
  readonly lot: LotView;
  /** The verdict to show; may be fresher than `lot.result` (a single-lot check). */
  readonly result: BuildabilityResult | null;
}

interface LotResultsProps {
  readonly status: ResultsStatus;
  readonly cards: readonly ResultsCard[];
  readonly eliminatedCount: number;
  readonly changes: ReadonlyMap<string, LotChange>;
  readonly trace: readonly TraceEvent[];
  readonly questions: Readonly<Record<string, TraceQuestion>>;
  readonly summary: string | null;
  /** Raw tool response for the JSON view. */
  readonly json: unknown;
  readonly jsonLabel: string;
  readonly openId: string | null;
  readonly onToggle: (propertyId: string) => void;
  readonly error: string | null;
  readonly onRetry: (() => void) | undefined;
  /** Shown for the empty state; null when there was no budget to remove. */
  readonly budget: number | null;
  readonly onRemoveBudget: () => void;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function verdictOf(card: ResultsCard): Verdict {
  return card.result?.overall ?? card.lot.item.overall ?? "unknown";
}

function unknownsOf(card: ResultsCard): number {
  return card.result?.unknownCount ?? card.lot.item.unknownCount;
}

/** Pass first, then unknown (fewest unknown rules first), then ruled out. */
export function sortCards(cards: readonly ResultsCard[]): ResultsCard[] {
  return [...cards].sort((a, b) => {
    const byVerdict = VERDICT_RANK[verdictOf(a)] - VERDICT_RANK[verdictOf(b)];
    return byVerdict !== 0 ? byVerdict : unknownsOf(a) - unknownsOf(b);
  });
}

function Reason({ card }: { readonly card: ResultsCard }) {
  const { result } = card;
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

function Chevron({ open }: { readonly open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={`size-3 transition-transform duration-200 ease-out-quint ${open ? "rotate-180" : ""}`}
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function LotCard({
  card,
  open,
  change,
  onToggle,
}: {
  readonly card: ResultsCard;
  readonly open: boolean;
  readonly change: LotChange | undefined;
  readonly onToggle: () => void;
}) {
  const { property } = card.lot.item;
  const verdict = verdictOf(card);
  const ruledOut = verdict === "fail";
  const panelId = `checks-${property.id}`;
  const [street, ...rest] = property.address.split(",");

  return (
    <li
      id={`lot-${property.id}`}
      className={`scroll-mt-24 overflow-hidden rounded-lg border bg-surface transition-colors duration-200 ${
        change ? "row-flash border-accent" : open ? "border-line-strong" : "border-line"
      } ${ruledOut && !open ? "opacity-60 hover:opacity-100" : ""}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex w-full flex-wrap items-center gap-x-3 gap-y-2.5 p-4 text-left transition-colors duration-150 hover:bg-raised sm:flex-nowrap sm:gap-5 sm:px-5"
      >
        <LotAerial
          propertyId={property.id}
          address={street ?? streetOf(property)}
          verdict={verdict}
          variant="thumb"
          className={`shrink-0 rounded-md max-sm:order-first max-sm:aspect-[2/1] max-sm:basis-full sm:aspect-[3/2] sm:w-32 ${
            open ? "max-sm:hidden" : ""
          }`}
        />
        <span className="shrink-0 sm:w-20">
          <VerdictBadge verdict={verdict} />
        </span>
        <span className="flex min-w-0 flex-col gap-1 max-sm:order-last max-sm:basis-full sm:flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="break-words text-base font-medium text-fg">{street ?? streetOf(property)}</span>
            {rest.length > 0 ? (
              <span className="text-sm text-faint max-sm:hidden">{rest.join(",").trim()}</span>
            ) : null}
            {change ? (
              <span className="font-mono text-xs text-accent">Seller answered</span>
            ) : null}
            {property.isFixture ? <DemoBadge /> : null}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted">
            {formatUsd(property.priceUsd)} · {formatAcres(property.acres)}
            {property.apn ? <span className="max-sm:hidden"> · APN {property.apn}</span> : null}
          </span>
          <Reason card={card} />
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-md text-sm text-muted transition-colors duration-150 group-hover:text-fg max-sm:ml-auto sm:border sm:border-line-strong sm:px-3 sm:py-1.5">
          <span className="max-sm:text-xs">{open ? "Hide checks" : "View checks"}</span>
          <Chevron open={open} />
        </span>
      </button>
      {open && card.result ? (
        <div id={panelId} className="expand-in border-t border-line bg-bg/40">
          <LotAerial
            propertyId={property.id}
            address={street ?? streetOf(property)}
            verdict={verdict}
            variant="header"
          />
          <VerdictList result={card.result} bare />
        </div>
      ) : null}
    </li>
  );
}

function SkeletonCard() {
  return (
    <li aria-hidden className="flex items-center gap-5 rounded-lg border border-line bg-surface p-4 sm:px-5">
      <span className="h-5 w-16 animate-pulse rounded bg-raised" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="h-4 w-1/2 max-w-64 animate-pulse rounded bg-raised" />
        <span className="h-3 w-32 animate-pulse rounded bg-raised" />
        <span className="h-3 w-3/4 max-w-96 animate-pulse rounded bg-raised" />
      </span>
      <span className="hidden h-8 w-28 animate-pulse rounded-md bg-raised sm:block" />
    </li>
  );
}

function Segmented({
  value,
  onChange,
}: {
  readonly value: ResultsView;
  readonly onChange: (next: ResultsView) => void;
}) {
  return (
    <div role="group" aria-label="Results view" className="flex rounded-md border border-line bg-bg p-0.5">
      {(["results", "json"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`min-h-11 rounded-[5px] px-3.5 text-sm transition-colors duration-150 sm:min-h-8 ${
            value === option ? "bg-raised text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {option === "json" ? "JSON" : "Results"}
        </button>
      ))}
    </div>
  );
}

export function LotResults({
  status,
  cards,
  eliminatedCount,
  changes,
  trace,
  questions,
  summary,
  json,
  jsonLabel,
  openId,
  onToggle,
  error,
  onRetry,
  budget,
  onRemoveBudget,
}: LotResultsProps) {
  const [view, setView] = useState<ResultsView>("results");
  const [traceOpen, setTraceOpen] = useState(false);
  const sorted = sortCards(cards);
  const pass = sorted.filter((c) => verdictOf(c) === "pass").length;
  const unknown = sorted.filter((c) => verdictOf(c) === "unknown").length;
  const ready = status === "ready";
  const jsonText = JSON.stringify(json, null, 2);

  const counts = [
    pass > 0 ? `${pass} ${pass === 1 ? "passes" : "pass"}` : null,
    eliminatedCount > 0 || sorted.length > 1 ? `${eliminatedCount} ruled out` : null,
    unknown > 0 ? `${unknown} need${unknown === 1 ? "s" : ""} answers from the seller` : null,
  ].filter((part): part is string => part !== null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="results-heading" className="text-2xl text-fg sm:text-3xl">
            Results{" "}
            <span className="font-mono text-xl tabular-nums text-faint sm:text-2xl">
              ({ready ? sorted.length : status === "empty" ? 0 : "…"})
            </span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            {ready ? counts.join(" · ") : status === "loading" ? "Checking every lot against your house…" : " "}
          </p>
        </div>
        {ready ? <Segmented value={view} onChange={setView} /> : null}
      </div>

      {ready && trace.length > 0 ? (
        <div className="rounded-lg border border-line">
          <button
            type="button"
            aria-expanded={traceOpen}
            onClick={() => setTraceOpen((v) => !v)}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-4 text-left font-mono text-xs text-muted transition-colors duration-150 hover:text-fg"
          >
            <span>
              {traceOpen ? "Hide" : "Show"} agent tool calls ({trace.length})
            </span>
            <Chevron open={traceOpen} />
          </button>
          {traceOpen ? (
            <div className="expand-in border-t border-line p-2">
              <TracePanel events={trace} questions={questions} summary={summary} />
            </div>
          ) : null}
        </div>
      ) : null}

      {status === "error" ? (
        <ErrorBanner message={error ?? "Could not load the lots. Try again."} onRetry={onRetry} />
      ) : null}

      {status === "loading" ? (
        <ul aria-label="Loading results" className="flex flex-col gap-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ul>
      ) : null}

      {status === "empty" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-5 py-6">
          <p className="text-sm text-fg">
            {budget === null
              ? "No lot is indexed for this search yet."
              : `No lot matches a budget under ${formatUsd(budget)}.`}
          </p>
          {budget !== null ? (
            <button
              type="button"
              onClick={onRemoveBudget}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong bg-raised px-3 text-sm text-fg hover:border-ink-500 sm:min-h-9"
            >
              Remove budget <span aria-hidden className="text-muted">✕</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {ready && view === "json" ? (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
            <span className="font-mono text-xs text-muted">{jsonLabel}</span>
            <CopyButton text={jsonText} />
          </div>
          <pre className="max-h-[32rem] overflow-auto px-4 py-3 font-mono text-xs leading-5 text-fg">
            {jsonText}
          </pre>
        </div>
      ) : null}

      {ready && view === "results" ? (
        <ul className="flex flex-col gap-2">
          {sorted.map((card) => {
            const id = card.lot.item.property.id;
            const change = changes.get(id);
            return (
              <LotCard
                key={`${id}-${change ? `${change.from}-${change.to}-${change.unknownTo}` : "static"}`}
                card={card}
                open={openId === id}
                change={change}
                onToggle={() => onToggle(id)}
              />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

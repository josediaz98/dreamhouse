"use client";

import Link from "next/link";
import type { Question } from "@/lib/contract";
import { USE_FIXTURES } from "@/lib/client/api";
import { formatAcres, formatUsd, streetOf } from "@/lib/client/format";
import { resetFixtureState } from "@/lib/client/fixture-store";
import type { LotView } from "@/lib/client/use-lots";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";
import { LotAerial } from "@/components/lot-aerial";
import { VerdictBadge } from "@/components/verdict-badge";
import { plural, useSellerData, verdictOf } from "@/components/seller/use-seller-data";

interface SellerRow {
  readonly lot: LotView;
  readonly open: number;
  readonly total: number;
  /** 0: open questions, 1: all answered, 2: ruled out. */
  readonly group: 0 | 1 | 2;
}

function buildRows(lots: readonly LotView[], questions: readonly Question[]): SellerRow[] {
  const rows = lots.map((lot): SellerRow => {
    const mine = questions.filter((q) => q.propertyId === lot.item.property.id);
    const open = mine.filter((q) => q.status === "open").length;
    const ruledOut = verdictOf(lot) === "fail";
    return { lot, open, total: mine.length, group: ruledOut ? 2 : open > 0 ? 0 : 1 };
  });
  return rows.sort((a, b) => a.group - b.group || b.open - a.open);
}

function statusLine(row: SellerRow): { readonly text: string; readonly tone: string } {
  if (row.group === 2) {
    return row.open > 0
      ? { text: `Ruled out · ${plural(row.open, "open question")}`, tone: "text-faint" }
      : { text: "Ruled out · no questions", tone: "text-faint" };
  }
  if (row.open > 0) return { text: plural(row.open, "open question"), tone: "text-unknown" };
  return { text: row.total > 0 ? "All answered" : "No open questions", tone: "text-pass" };
}

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-3.5 shrink-0 text-muted transition-colors duration-150 group-hover:text-fg"
    >
      <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function Row({ row }: { readonly row: SellerRow }) {
  const { property } = row.lot.item;
  const verdict = verdictOf(row.lot);
  const [street, ...rest] = property.address.split(",");
  const status = statusLine(row);

  return (
    <li>
      <Link
        href={`/seller/${property.id}`}
        className={`group flex min-h-11 items-center gap-3 rounded-lg bg-surface p-3 transition-colors duration-150 hover:bg-raised sm:gap-5 sm:p-4 ${
          row.group === 0 ? "unknown-edge" : "border border-line"
        } ${row.group === 2 ? "opacity-60 hover:opacity-100" : ""}`}
      >
        <LotAerial
          propertyId={property.id}
          address={street ?? streetOf(property)}
          verdict={verdict}
          variant="thumb"
          className="aspect-[3/2] w-24 shrink-0 rounded-md sm:w-32"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="break-words text-base font-medium text-fg">{street ?? streetOf(property)}</span>
            {rest.length > 0 ? (
              <span className="text-sm text-faint max-sm:hidden">{rest.join(",").trim()}</span>
            ) : null}
          </span>
          <span className="font-mono text-xs tabular-nums text-muted">
            {formatUsd(property.priceUsd)} · {formatAcres(property.acres)}
          </span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <VerdictBadge verdict={verdict} />
            <span className={`font-mono text-xs tabular-nums ${status.tone}`}>{status.text}</span>
          </span>
        </span>
        <Chevron />
      </Link>
    </li>
  );
}

function SkeletonRow() {
  return (
    <li aria-hidden className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 sm:gap-5 sm:p-4">
      <span className="aspect-[3/2] w-24 shrink-0 animate-pulse rounded-md bg-raised sm:w-32" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="h-4 w-1/2 max-w-64 animate-pulse rounded bg-raised" />
        <span className="h-3 w-32 animate-pulse rounded bg-raised" />
        <span className="h-4 w-40 animate-pulse rounded bg-raised" />
      </span>
    </li>
  );
}

export function SellerConsole() {
  const { lots, questions, questionsError, reloadQuestions } = useSellerData();
  const ready = lots.lots.length > 0 && questions !== null;
  const rows = ready ? buildRows(lots.lots, questions) : [];
  const error = lots.status === "error" ? lots.error : questionsError;

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-10 sm:px-6 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl text-fg sm:text-4xl">Seller console</h1>
          <p className="mt-2 text-base text-muted">
            Questions agents could not answer from the listing or the rules. Answer them to update the verdict
            buyers see.
          </p>
          <p className="mt-2 font-mono text-xs text-faint">Demo: answers are entered by the presenter.</p>
        </div>
        {USE_FIXTURES ? (
          <div className="flex items-center gap-2">
            <DemoBadge />
            <button
              type="button"
              onClick={resetFixtureState}
              className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg hover:bg-raised max-sm:min-h-11"
            >
              Reset demo
            </button>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="mb-4">
          <ErrorBanner
            message={error}
            onRetry={() => {
              lots.refresh();
              reloadQuestions();
            }}
          />
        </div>
      ) : null}

      {ready ? (
        <ul aria-label="Lots" className="flex flex-col gap-2">
          {rows.map((row) => (
            <Row key={row.lot.item.property.id} row={row} />
          ))}
        </ul>
      ) : error ? null : (
        <ul aria-label="Loading lots" className="flex flex-col gap-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ul>
      )}
    </div>
  );
}

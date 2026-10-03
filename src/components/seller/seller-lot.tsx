"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatAcres, formatUsd, streetOf } from "@/lib/client/format";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { ErrorBanner } from "@/components/error-banner";
import { LotAerial } from "@/components/lot-aerial";
import { VerdictBadge } from "@/components/verdict-badge";
import { VerdictList } from "@/components/verdict-list";
import { LotReason } from "@/components/seller/lot-reason";
import { AnsweredRow, OpenRow } from "@/components/seller/question-group";
import { plural, useSellerData, verdictOf } from "@/components/seller/use-seller-data";

/** If Realtime misses the event, re-check once after an answer. */
const FALLBACK_REFRESH_MS = 3000;

function BackLink() {
  return (
    <Link
      href="/seller"
      className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-fg sm:min-h-8"
    >
      ← All lots
    </Link>
  );
}

export function SellerLot({ propertyId }: { readonly propertyId: string }) {
  const { lots, questions, questionsError, reloadQuestions } = useSellerData();
  const lot = lots.lots.find(({ item }) => item.property.id === propertyId) ?? null;
  const change = lots.changes.get(propertyId);
  const versionAtAnswer = useRef<number | null>(null);
  const versionRef = useRef(lots.version);
  const fallback = useRef<number | undefined>(undefined);

  useEffect(() => {
    versionRef.current = lots.version;
  }, [lots.version]);

  useEffect(() => () => window.clearTimeout(fallback.current), []);

  function onAnswered() {
    reloadQuestions();
    versionAtAnswer.current = versionRef.current;
    window.clearTimeout(fallback.current);
    fallback.current = window.setTimeout(() => {
      if (versionRef.current === versionAtAnswer.current) lots.refresh();
    }, FALLBACK_REFRESH_MS);
  }

  const shell = "mx-auto w-full max-w-[880px] px-4 py-8 sm:px-6 lg:py-10";

  if (lots.status === "error" && !lot) {
    return (
      <div className={shell}>
        <BackLink />
        <div className="mt-4">
          <ErrorBanner message={lots.error ?? "Could not load the lot. Try again."} onRetry={lots.refresh} />
        </div>
      </div>
    );
  }

  if (!lot) {
    const loaded = lots.status === "ready";
    return (
      <div className={shell}>
        <BackLink />
        {loaded ? (
          <h1 className="mt-6 text-2xl text-fg">Lot not found</h1>
        ) : (
          <div aria-label="Loading lot" className="mt-4 flex flex-col gap-4">
            <div className="aspect-video w-full animate-pulse rounded-lg bg-raised" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-raised" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-raised" />
          </div>
        )}
      </div>
    );
  }

  const { property } = lot.item;
  const verdict = verdictOf(lot);
  const [street, ...rest] = property.address.split(",");
  const mine = (questions ?? []).filter((q) => q.propertyId === propertyId);
  const open = mine.filter((q) => q.status === "open");
  const answered = mine.filter((q) => q.status === "answered");

  return (
    <div className={shell}>
      <BackLink />

      <header className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
        <LotAerial propertyId={property.id} address={street ?? streetOf(property)} verdict={verdict} variant="header" />
        <div className="flex flex-col gap-1 px-4 pt-4 sm:px-5">
          <h1 className="break-words text-2xl text-fg sm:text-3xl">{street ?? streetOf(property)}</h1>
          {rest.length > 0 ? <p className="text-sm text-faint">{rest.join(",").trim()}</p> : null}
          <p className="font-mono text-xs tabular-nums text-muted">
            {formatUsd(property.priceUsd)} · {formatAcres(property.acres)} · {property.apn ? `APN ${property.apn}` : "APN not resolved"}
          </p>
        </div>
        <div
          key={change ? `${change.from}-${change.to}-${change.unknownTo}` : "static"}
          aria-live="polite"
          className={`m-4 flex flex-col gap-2 rounded-md border px-4 py-4 sm:mx-5 sm:flex-row sm:items-center sm:gap-4 ${
            change ? "row-flash border-accent" : "border-line bg-bg/40"
          }`}
        >
          <span className="shrink-0 self-start sm:self-center">
            <VerdictBadge verdict={verdict} />
          </span>
          <LotReason result={lot.result} className="text-base sm:text-lg" />
        </div>
      </header>

      <section aria-labelledby="questions-heading" className="mt-8">
        <h2 id="questions-heading" className="text-xl text-fg sm:text-2xl">
          Open questions{" "}
          <span className="font-mono text-base tabular-nums text-faint">({questions === null ? "…" : open.length})</span>
        </h2>
        {questionsError ? (
          <div className="mt-3">
            <ErrorBanner message={questionsError} onRetry={reloadQuestions} />
          </div>
        ) : null}
        {questions === null && !questionsError ? <p className="mt-3 text-sm text-muted">Loading questions…</p> : null}
        {questions !== null && mine.length === 0 ? (
          <p className="mt-3 rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted">
            {verdict === "fail"
              ? "Ruled out · no questions for the seller."
              : "No questions for the seller on this lot."}
          </p>
        ) : null}
        {mine.length > 0 ? (
          <>
            {open.length === 0 ? (
              <p className="mt-1 font-mono text-xs text-pass">All answered · {plural(answered.length, "answer")}</p>
            ) : null}
            <ul
              className={`mt-3 divide-y divide-line overflow-hidden rounded-lg bg-surface ${
                open.length > 0 ? "unknown-edge" : "border border-line"
              }`}
            >
              {open.map((q) => (
                <OpenRow key={q.id} question={q} onAnswered={onAnswered} />
              ))}
              {answered.map((q) => (
                <AnsweredRow key={q.id} question={q} />
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section aria-labelledby="checks-heading" className="mt-8">
        <h2 id="checks-heading" className="text-xl text-fg sm:text-2xl">
          Checks
        </h2>
        <p className="mt-1 font-mono text-xs text-faint">
          Demo program: {DEFAULT_PROGRAM.heightFt} ft · {DEFAULT_PROGRAM.footprintSqFt.toLocaleString("en-US")} sq ft footprint ·{" "}
          {DEFAULT_PROGRAM.deckSqFt.toLocaleString("en-US")} sq ft deck · {DEFAULT_PROGRAM.stories} stories
        </p>
        <div className="mt-3">
          {lot.result ? (
            <VerdictList result={lot.result} />
          ) : (
            <p className="text-sm text-muted">Checking the rules…</p>
          )}
        </div>
      </section>
    </div>
  );
}

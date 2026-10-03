"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { HouseProgram } from "@/lib/contract";
import { searchProperties } from "@/lib/client/api";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { matchLot, useLotCheck } from "@/lib/client/use-lot-check";
import { useLots } from "@/lib/client/use-lots";
import { BeforeAfter } from "@/components/before-after";
import { CommandBox, type CommandMode, type SearchQuery } from "@/components/command-box";
import { Hero } from "@/components/hero";
import { LotResults, type ResultsCard, type ResultsStatus } from "@/components/lot-results";
import { ParcelSheet } from "@/components/parcel-sheet";

const DEFAULT_QUERY = {
  program: DEFAULT_PROGRAM,
  maxPriceUsd: 400_000,
} as const satisfies SearchQuery;

type Shown = "none" | "search" | "check";

interface ScrollTarget {
  readonly elementId: string;
  readonly tick: number;
}

function sameProgram(a: HouseProgram, b: HouseProgram): boolean {
  return (
    a.footprintSqFt === b.footprintSqFt &&
    a.deckSqFt === b.deckSqFt &&
    a.heightFt === b.heightFt &&
    a.stories === b.stories
  );
}

function sameQuery(a: SearchQuery, b: SearchQuery): boolean {
  return a.maxPriceUsd === b.maxPriceUsd && sameProgram(a.program, b.program);
}

function Section({
  index,
  title,
  children,
}: {
  readonly index: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tabular-nums text-faint">{index}</p>
          <h2 className="max-w-3xl text-3xl text-fg sm:text-4xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

const STEPS = [
  {
    name: "Ingest",
    text: "Claude extracts each listing into typed fields, and every field keeps its source and page.",
  },
  {
    name: "Decide",
    text: "Deterministic rules from the Design Manual and county GIS return pass, fail or unknown. The model never decides.",
  },
  {
    name: "Ask",
    text: "Each unknown becomes a question to the seller, and the answer updates the verdict live.",
  },
] as const;

function HowItWorks() {
  return (
    <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
      {STEPS.map((step, i) => (
        <li key={step.name} className="flex flex-col gap-3 bg-surface p-6 sm:p-8">
          <span className="flex items-center gap-3 font-mono text-xs text-faint">
            <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            {i < STEPS.length - 1 ? (
              <span aria-hidden className="h-px flex-1 border-t border-dashed border-line-strong" />
            ) : null}
          </span>
          <h3 className="text-2xl text-fg">{step.name}</h3>
          <p className="text-sm text-muted">{step.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function Landing() {
  const [draft, setDraft] = useState<SearchQuery>(DEFAULT_QUERY);
  const [active, setActive] = useState<SearchQuery>(DEFAULT_QUERY);
  const lotsState = useLots(active.program, {
    maxPriceUsd: active.maxPriceUsd ?? undefined,
  });
  const check = useLotCheck(lotsState.lots);

  const [mode, setMode] = useState<CommandMode>("search");
  const [shown, setShown] = useState<Shown>("none");
  const [pendingVersion, setPendingVersion] = useState<number | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lotQuery, setLotQuery] = useState("");
  const [checkProgram, setCheckProgram] = useState<HouseProgram>(DEFAULT_PROGRAM);
  const [lotCount, setLotCount] = useState<number | null>(null);
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);

  // Read-only: the indexed lot count for the hero chip. No program, no budget, no writes.
  useEffect(() => {
    let cancelled = false;
    searchProperties({})
      .then((r) => {
        if (!cancelled) setLotCount(r.items.length);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scrollTarget) return;
    const frame = window.requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById(scrollTarget.elementId)
        ?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [scrollTarget]);

  function scrollTo(elementId: string) {
    setScrollTarget((prev) => ({ elementId, tick: (prev?.tick ?? 0) + 1 }));
  }

  function runSearch(next: SearchQuery) {
    setShown("search");
    setOpenId(null);
    setPendingVersion(lotsState.version);
    if (sameQuery(next, active)) lotsState.refresh();
    else setActive(next);
    scrollTo("results");
  }

  function runCheck(rawQuery: string) {
    const match = matchLot(rawQuery, lotsState.lots);
    setShown("check");
    setOpenId(match?.item.property.id ?? null);
    setCheckProgram(draft.program);
    void check.run(rawQuery, draft.program);
    scrollTo("results");
  }

  function submit() {
    if (mode === "search") runSearch(draft);
    else runCheck(lotQuery);
  }

  function removeBudget() {
    const next = { ...draft, maxPriceUsd: null };
    setDraft(next);
    runSearch(next);
  }

  function showLot(propertyId: string) {
    setMode("search");
    setShown("search");
    setOpenId(propertyId);
    scrollTo(`lot-${propertyId}`);
  }

  const presets = [...lotsState.lots]
    .filter(({ item }) => !item.property.isFixture)
    .sort((a, b) => a.item.property.address.localeCompare(b.item.property.address))
    .slice(0, 3);

  // ---- Results view model, one shape for both modes -------------------------------------
  const searchPending =
    pendingVersion !== null && lotsState.version === pendingVersion && lotsState.status !== "error";

  let status: ResultsStatus;
  let cards: readonly ResultsCard[];
  let eliminatedCount: number;
  if (shown === "check") {
    const lot = check.property
      ? lotsState.lots.find(({ item }) => item.property.id === check.property?.id)
      : undefined;
    // The live list carries realtime updates; use it when it was computed for the same house.
    const live = lot && sameProgram(checkProgram, active.program) ? lot.result : null;
    const result = live ?? check.result;
    status =
      check.phase === "error"
        ? "error"
        : check.result === null || !lot
          ? "loading"
          : "ready";
    cards = lot ? [{ lot, result }] : [];
    eliminatedCount = result?.overall === "fail" ? 1 : 0;
  } else {
    status =
      searchPending || lotsState.status === "loading"
        ? "loading"
        : lotsState.status === "error"
          ? "error"
          : lotsState.lots.length === 0
            ? "empty"
            : "ready";
    cards = lotsState.lots.map((lot) => ({ lot, result: lot.result }));
    eliminatedCount = lotsState.eliminatedCount;
  }

  const openQuestions = new Set(
    lotsState.lots.flatMap(({ result }) => result?.openQuestionIds ?? []),
  ).size;

  const busy =
    (shown === "search" && status === "loading") || (shown === "check" && check.phase === "running");

  return (
    <>
      <Hero lotCount={lotCount}>
        <CommandBox
          mode={mode}
          onModeChange={setMode}
          query={draft}
          onQueryChange={setDraft}
          lotQuery={lotQuery}
          onLotQueryChange={setLotQuery}
          presets={presets}
          onPreset={(lot) => {
            setLotQuery(lot.item.property.address);
            runCheck(lot.item.property.address);
          }}
          onSubmit={submit}
          busy={busy}
        />
      </Hero>

      {shown !== "none" ? (
        <section
          id="results"
          aria-labelledby="results-heading"
          className="scroll-mt-4 pb-20 pt-4 sm:pb-28"
        >
          <div className="mx-auto w-full max-w-[55rem] px-4 sm:px-6 lg:px-0">
            <LotResults
              key={shown}
              status={status}
              cards={cards}
              eliminatedCount={eliminatedCount}
              changes={lotsState.changes}
              trace={shown === "check" ? check.events : lotsState.trace}
              questions={shown === "check" ? check.questions : {}}
              summary={
                shown === "check"
                  ? check.summary
                  : `${lotsState.lots.length} lots checked against your house · ${lotsState.eliminatedCount} ruled out`
              }
              json={shown === "check" ? check.result : lotsState.raw}
              jsonLabel={shown === "check" ? "check_buildability response" : "search_properties response"}
              openId={openId}
              onToggle={(id) => setOpenId((prev) => (prev === id ? null : id))}
              error={shown === "check" ? check.message : lotsState.error}
              onRetry={
                shown === "check"
                  ? check.lastQuery === null
                    ? undefined
                    : () => runCheck(check.lastQuery ?? lotQuery)
                  : lotsState.refresh
              }
              budget={active.maxPriceUsd}
              onRemoveBudget={removeBudget}
            />
          </div>
        </section>
      ) : null}

      <Section index="01" title="How it works">
        <HowItWorks />
      </Section>

      <Section index="02" title="Where the facts stop, the line is dashed.">
        <ParcelSheet state={lotsState} selectedId={openId} onSelect={showLot} />
      </Section>

      <Section index="03" title="Guessing vs knowing">
        <BeforeAfter eliminatedCount={lotsState.eliminatedCount} openQuestions={openQuestions} />
      </Section>
    </>
  );
}

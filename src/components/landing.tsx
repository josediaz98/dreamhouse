"use client";

import { useEffect, useState } from "react";
import type { HouseProgram } from "@/lib/contract";
import { searchProperties } from "@/lib/client/api";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { matchLot, useLotCheck } from "@/lib/client/use-lot-check";
import { useLots } from "@/lib/client/use-lots";
import { CommandBox, type CommandMode, type SearchQuery } from "@/components/command-box";
import { Hero } from "@/components/hero";
import { LotResults, type ResultsCard, type ResultsStatus } from "@/components/lot-results";
import {
  CONNECT_EVENT,
  OnboardingModal,
  TOUR_EVENT,
  TOUR_STORAGE_KEY,
} from "@/components/onboarding-modal";

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
  const [tourOpen, setTourOpen] = useState(false);

  // First visit per browser opens the tour. ?tour=0 never opens it, ?tour=1 always does.
  // If storage throws (private mode), it opens once per page load. Local only, no API writes.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("tour");
    if (param === "0") return;
    let show = param === "1";
    if (!show) {
      try {
        show = window.localStorage.getItem(TOUR_STORAGE_KEY) === null;
        window.localStorage.setItem(TOUR_STORAGE_KEY, "seen");
      } catch {
        show = true;
      }
    }
    if (!show) return;
    const frame = window.requestAnimationFrame(() => setTourOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // The header "How it works" link reopens the tour at step 1.
  useEffect(() => {
    function onTour() {
      setTourOpen(true);
    }
    window.addEventListener(TOUR_EVENT, onTour);
    return () => window.removeEventListener(TOUR_EVENT, onTour);
  }, []);

  function closeTour(returnFocus = true) {
    setTourOpen(false);
    if (!returnFocus) return;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#command-box button[type="submit"]')?.focus({ preventScroll: true });
    });
  }

  function searchFromTour() {
    closeTour(false);
    setMode("search");
    setDraft(DEFAULT_QUERY);
    runSearch(DEFAULT_QUERY);
  }

  function connectFromTour() {
    closeTour(false);
    window.requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(CONNECT_EVENT)));
  }

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

  const busy =
    (shown === "search" && status === "loading") || (shown === "check" && check.phase === "running");

  return (
    <>
      <Hero lotCount={lotCount}>
        <div id="command-box" className="flex w-full justify-center">
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
        </div>
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
              map={lotsState}
              onMapSelect={showLot}
            />
          </div>
        </section>
      ) : null}

      {tourOpen ? (
        <OnboardingModal
          open
          lotCount={lotCount}
          onClose={() => closeTour()}
          onSearch={searchFromTour}
          onConnect={connectFromTour}
        />
      ) : null}
    </>
  );
}

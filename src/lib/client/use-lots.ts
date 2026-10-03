"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BuildabilityResult,
  HouseProgram,
  SearchItem,
  SearchPropertiesOutput,
  TraceEvent,
  Verdict,
} from "@/lib/contract";
import { checkBuildability, searchProperties } from "@/lib/client/api";
import { streetOf, VERDICT_RANK } from "@/lib/client/format";
import { plainError } from "@/lib/client/errors";
import { subscribeToChanges } from "@/lib/client/realtime";

export interface LotView {
  readonly item: SearchItem;
  readonly result: BuildabilityResult | null;
}

export interface LotChange {
  readonly from: Verdict | null;
  readonly to: Verdict | null;
  readonly unknownFrom: number;
  readonly unknownTo: number;
}

export interface LotsState {
  readonly status: "loading" | "ready" | "error";
  readonly error: string | null;
  /** Ranked: buildable first, unknown next (fewest unknown rules first), ruled out last. */
  readonly lots: readonly LotView[];
  readonly eliminatedCount: number;
  /** Verdict changes from the last realtime refresh, keyed by property id. */
  readonly changes: ReadonlyMap<string, LotChange>;
  /** Increments after every successful load; lets other panels refetch. */
  readonly version: number;
  readonly refresh: () => void;
  /** The raw `search_properties` response of the last load, for the JSON view. */
  readonly raw: SearchPropertiesOutput | null;
  /** Tool calls of the last full load, with wall-clock timings. */
  readonly trace: readonly TraceEvent[];
}

export interface LotsOptions {
  /** Budget filter passed to `search_properties`. Undefined means no limit. */
  readonly maxPriceUsd?: number;
}

const CHANGE_VISIBLE_MS = 8000;
const EVENT_DEBOUNCE_MS = 150;

function unknownRules(lot: LotView): number {
  return lot.result?.unknownCount ?? lot.item.unknownCount;
}

function rank(lots: readonly LotView[]): LotView[] {
  return [...lots].sort((a, b) => {
    const byVerdict =
      VERDICT_RANK[a.item.overall ?? "unknown"] - VERDICT_RANK[b.item.overall ?? "unknown"];
    if (byVerdict !== 0) return byVerdict;
    return unknownRules(a) - unknownRules(b);
  });
}

async function timed<T>(fn: () => Promise<T>): Promise<{ readonly value: T; readonly ms: number }> {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function useLots(program: HouseProgram, options: LotsOptions = {}): LotsState {
  const { maxPriceUsd } = options;
  const [lots, setLots] = useState<readonly LotView[]>([]);
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [status, setStatus] = useState<LotsState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [changes, setChanges] = useState<ReadonlyMap<string, LotChange>>(new Map());
  const [raw, setRaw] = useState<SearchPropertiesOutput | null>(null);
  const [trace, setTrace] = useState<readonly TraceEvent[]>([]);
  const previous = useRef<ReadonlyMap<string, { overall: Verdict | null; unknown: number }>>(
    new Map(),
  );
  const resultCache = useRef<Map<string, BuildabilityResult>>(new Map());
  const loadId = useRef(0);

  const load = useCallback(
    async (changedId: string | null) => {
      const id = ++loadId.current;
      try {
        const input = maxPriceUsd === undefined ? { program } : { program, maxPriceUsd };
        const search = await timed(() => searchProperties(input));
        // Re-check everything on the first load; afterwards only the lot that changed.
        const partial = changedId !== null && resultCache.current.size > 0;
        const toCheck = partial
          ? search.value.items.filter((i) => i.property.id === changedId)
          : search.value.items;
        const fresh = await Promise.all(
          toCheck.map((i) =>
            timed(() => checkBuildability({ propertyId: i.property.id, program })).then(
              (checked) => ({ ...checked, item: i }),
            ),
          ),
        );
        // A newer load started while this one was in flight: its answer wins.
        if (id !== loadId.current) return;
        for (const { value } of fresh) resultCache.current.set(value.propertyId, value);

        const next = rank(
          search.value.items.map((item) => ({
            item,
            result: resultCache.current.get(item.property.id) ?? null,
          })),
        );

        const diff = new Map<string, LotChange>();
        if (previous.current.size > 0) {
          for (const { item } of next) {
            const before = previous.current.get(item.property.id);
            if (!before) continue;
            if (before.overall !== item.overall || before.unknown !== item.unknownCount) {
              diff.set(item.property.id, {
                from: before.overall,
                to: item.overall,
                unknownFrom: before.unknown,
                unknownTo: item.unknownCount,
              });
            }
          }
        }
        previous.current = new Map(
          next.map(({ item }) => [
            item.property.id,
            { overall: item.overall, unknown: item.unknownCount },
          ]),
        );

        if (!partial) {
          setTrace([
            {
              id: "search",
              tool: "search_properties",
              status: "ok",
              label: `${plural(search.value.items.length, "lot")} · ${search.value.eliminatedCount} ruled out`,
              ms: search.ms,
            },
            ...fresh.map(({ value, ms, item }) => ({
              id: `check-${value.propertyId}`,
              tool: "check_buildability" as const,
              status: value.overall === "pass" ? ("ok" as const) : value.overall,
              label: `${streetOf(item.property)} · ${value.overall}${
                value.unknownCount > 0 ? ` · ${plural(value.unknownCount, "unknown")}` : ""
              }`,
              ms,
            })),
          ]);
        }
        setRaw(search.value);
        setLots(next);
        setEliminatedCount(search.value.eliminatedCount);
        setError(null);
        setStatus("ready");
        setVersion((v) => v + 1);
        if (diff.size > 0) {
          setChanges(diff);
          window.setTimeout(() => setChanges(new Map()), CHANGE_VISIBLE_MS);
        }
      } catch (e) {
        if (id !== loadId.current) return;
        setError(plainError(e, "load the lots"));
        setStatus("error");
      }
    },
    [program, maxPriceUsd],
  );

  useEffect(() => {
    // A new program or budget is a new search, not a seller answer: no change highlights.
    previous.current = new Map();
    resultCache.current.clear();
    // Deferred one tick so a StrictMode double mount cancels the first fetch.
    const initial = window.setTimeout(() => void load(null), 0);
    let timer: number | undefined;
    const unsubscribe = subscribeToChanges((event) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(event.propertyId), EVENT_DEBOUNCE_MS);
    });
    return () => {
      window.clearTimeout(initial);
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => {
    resultCache.current.clear();
    setStatus("loading");
    void load(null);
  }, [load]);

  return { status, error, lots, eliminatedCount, changes, version, refresh, raw, trace };
}

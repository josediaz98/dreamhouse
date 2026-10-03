"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildabilityResult, HouseProgram, SearchItem, Verdict } from "@/lib/contract";
import { checkBuildability, searchProperties } from "@/lib/client/api";
import { VERDICT_RANK } from "@/lib/client/format";
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
  /** Ranked: buildable first, unknown next, ruled out last. */
  readonly lots: readonly LotView[];
  readonly eliminatedCount: number;
  /** Verdict changes from the last realtime refresh, keyed by property id. */
  readonly changes: ReadonlyMap<string, LotChange>;
  /** Increments after every successful load; lets other panels refetch. */
  readonly version: number;
  readonly refresh: () => void;
}

const CHANGE_VISIBLE_MS = 8000;
const EVENT_DEBOUNCE_MS = 150;

function rank(lots: readonly LotView[]): LotView[] {
  return [...lots].sort((a, b) => {
    const byVerdict =
      VERDICT_RANK[a.item.overall ?? "unknown"] - VERDICT_RANK[b.item.overall ?? "unknown"];
    if (byVerdict !== 0) return byVerdict;
    return a.item.unknownCount - b.item.unknownCount;
  });
}

export function useLots(program: HouseProgram): LotsState {
  const [lots, setLots] = useState<readonly LotView[]>([]);
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [status, setStatus] = useState<LotsState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [changes, setChanges] = useState<ReadonlyMap<string, LotChange>>(new Map());
  const previous = useRef<ReadonlyMap<string, { overall: Verdict | null; unknown: number }>>(
    new Map(),
  );
  const resultCache = useRef<Map<string, BuildabilityResult>>(new Map());

  const load = useCallback(
    async (changedId: string | null) => {
      try {
        const search = await searchProperties({ program });
        // Re-check everything on the first load; afterwards only the lot that changed.
        const toCheck =
          changedId !== null && resultCache.current.size > 0
            ? search.items.filter((i) => i.property.id === changedId)
            : search.items;
        const fresh = await Promise.all(
          toCheck.map((i) => checkBuildability({ propertyId: i.property.id, program })),
        );
        for (const result of fresh) resultCache.current.set(result.propertyId, result);

        const next = rank(
          search.items.map((item) => ({
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

        setLots(next);
        setEliminatedCount(search.eliminatedCount);
        setError(null);
        setStatus("ready");
        setVersion((v) => v + 1);
        if (diff.size > 0) {
          setChanges(diff);
          window.setTimeout(() => setChanges(new Map()), CHANGE_VISIBLE_MS);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load lots");
        setStatus("error");
      }
    },
    [program],
  );

  useEffect(() => {
    void load(null);
    let timer: number | undefined;
    const unsubscribe = subscribeToChanges((event) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(event.propertyId), EVENT_DEBOUNCE_MS);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(() => {
    resultCache.current.clear();
    setStatus("loading");
    void load(null);
  }, [load]);

  return { status, error, lots, eliminatedCount, changes, version, refresh };
}

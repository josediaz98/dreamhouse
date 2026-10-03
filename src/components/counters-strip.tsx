"use client";

import { useEffect, useState } from "react";
import { USE_FIXTURES, getSpec } from "@/lib/client/api";
import type { LotView } from "@/lib/client/use-lots";
import { DemoBadge } from "@/components/demo-badge";

interface CountersStripProps {
  readonly lots: readonly LotView[];
  readonly eliminatedCount: number;
}

interface Tile {
  readonly label: string;
  readonly value: string;
}

export function CountersStrip({ lots, eliminatedCount }: CountersStripProps) {
  const [sourcedPct, setSourcedPct] = useState<number | null>(null);
  const ids = lots.map(({ item }) => item.property.id).join(",");
  const anyFixture = USE_FIXTURES || lots.some(({ item }) => item.property.isFixture);

  useEffect(() => {
    if (ids === "") return;
    let cancelled = false;
    Promise.all(ids.split(",").map((propertyId) => getSpec({ propertyId })))
      .then((specs) => {
        if (cancelled) return;
        const fields = specs.flatMap((s) => s.fields);
        const sourced = fields.filter((f) => f.status === "known" && f.source !== null).length;
        setSourcedPct(fields.length === 0 ? null : (sourced / fields.length) * 100);
      })
      .catch(() => {
        if (!cancelled) setSourcedPct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const rules = new Set(lots.flatMap(({ result }) => result?.checks.map((c) => c.rule) ?? []));
  const questions = new Set(lots.flatMap(({ result }) => result?.openQuestionIds ?? []));

  const tiles: readonly Tile[] = [
    { label: "Lots indexed", value: String(lots.length) },
    { label: "Rules encoded", value: String(rules.size) },
    { label: "Facts sourced", value: sourcedPct === null ? "—" : `${Math.round(sourcedPct)}%` },
    { label: "Visits avoided", value: String(eliminatedCount) },
    { label: "Unknowns → questions", value: String(questions.size) },
  ];

  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-surface px-4 py-3">
            <dt className="text-xs text-muted">{tile.label}</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fg">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
      {anyFixture ? (
        <p className="text-xs text-muted">
          <DemoBadge /> Counters are computed from placeholder lots, not real listings.
        </p>
      ) : null}
    </div>
  );
}

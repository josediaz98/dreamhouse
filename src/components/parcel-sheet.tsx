"use client";

import type { Verdict } from "@/lib/contract";
import { CELL, commonScale, outlinePath } from "@/lib/client/parcel-layout";
import type { LotsState } from "@/lib/client/use-lots";
import { PARCEL_SHAPES, type ParcelShape } from "@/lib/parcel-shapes";
import { ErrorBanner } from "@/components/error-banner";
import { VerdictBadge } from "@/components/verdict-badge";

const SCALE_BAR_FT = 200;
const SCALE = commonScale(PARCEL_SHAPES);

const STROKE: Record<Verdict, string> = {
  pass: "stroke-pass fill-pass/10",
  fail: "stroke-fail fill-fail/10",
  unknown: "stroke-unknown fill-unknown/10",
};

interface ParcelSheetProps {
  readonly state: LotsState;
  readonly selectedId: string | null;
  readonly onSelect: (propertyId: string) => void;
}

function Caption({ shape }: { readonly shape: ParcelShape }) {
  const acres = shape.acres === null ? null : `${Number(shape.acres.toFixed(2))} ac`;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="break-words font-mono text-sm text-fg">{shape.label}</span>
      <span className="break-words font-mono text-xs text-muted">
        {[shape.apn ? `APN ${shape.apn}` : "APN unresolved", acres].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}

function ParcelCard({
  shape,
  verdict,
  selected,
  changed,
  onSelect,
}: {
  readonly shape: ParcelShape;
  readonly verdict: Verdict | null;
  readonly selected: boolean;
  readonly changed: boolean;
  readonly onSelect: () => void;
}) {
  const tone = STROKE[verdict ?? "unknown"];
  // The dashed edge is the product's "unknown" state; it never relies on colour alone.
  const dash = verdict === null || verdict === "unknown" ? "6 4" : undefined;
  const cx = CELL.width / 2;
  const cy = CELL.height / 2;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${shape.label}: ${verdict ?? "no verdict yet"}. Select to check this lot.`}
      className={`flex w-full min-w-0 flex-col gap-2 rounded-lg border bg-surface p-3 text-left hover:bg-raised ${
        selected ? "border-accent" : "border-line"
      } ${changed ? "row-flash" : ""}`}
    >
      <svg
        viewBox={`0 0 ${CELL.width} ${CELL.height}`}
        aria-hidden
        className="h-auto w-full rounded bg-bg"
      >
        {shape.outline ? (
          <path
            d={outlinePath(shape.outline, SCALE)}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeDasharray={dash}
            className={tone}
          />
        ) : (
          <>
            <rect
              x={cx - 60}
              y={cy - 45}
              width={120}
              height={90}
              rx={2}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              className="fill-none stroke-accent"
            />
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              fontSize={40}
              className="fill-accent font-mono"
            >
              ?
            </text>
          </>
        )}
      </svg>
      <Caption shape={shape} />
      {shape.outline === null ? (
        <span className="text-xs text-muted">parcel not resolved · not to scale</span>
      ) : null}
      {verdict ? (
        <span>
          <VerdictBadge verdict={verdict} />
        </span>
      ) : (
        <span className="text-xs text-muted">no verdict yet</span>
      )}
    </button>
  );
}

function Legend() {
  const barWidth = SCALE_BAR_FT * SCALE;
  const x0 = 20;
  const y0 = CELL.height - 28;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-surface p-3">
      <svg
        viewBox={`0 0 ${CELL.width} ${CELL.height}`}
        role="img"
        aria-label={`Scale bar: ${SCALE_BAR_FT} feet. North is up.`}
        className="h-auto w-full rounded bg-bg"
      >
        <g className="stroke-fg" strokeWidth={1.5} fill="none">
          <path d={`M${x0} ${y0}H${x0 + barWidth}M${x0} ${y0 - 5}V${y0 + 5}M${x0 + barWidth} ${y0 - 5}V${y0 + 5}`} />
        </g>
        <text x={x0} y={y0 - 10} fontSize={15} className="fill-fg font-mono">
          {SCALE_BAR_FT} ft
        </text>
        <g className="stroke-fg" strokeWidth={1.5} fill="none">
          <path d="M200 70V28M200 28L194 40M200 28L206 40" />
        </g>
        <text x={200} y={90} fontSize={16} textAnchor="middle" className="fill-fg font-mono">
          N
        </text>
      </svg>
      <span className="font-mono text-sm text-fg">Scale</span>
      <span className="text-xs text-muted">{SCALE_BAR_FT} ft scale bar. One scale for every lot. North is up.</span>
    </div>
  );
}

export function ParcelSheet({ state, selectedId, onSelect }: ParcelSheetProps) {
  const { lots, status, changes } = state;
  const verdictOf = (id: string): Verdict | null =>
    lots.find(({ item }) => item.property.id === id)?.item.overall ?? null;
  const hasMatch = PARCEL_SHAPES.some((s) => lots.some(({ item }) => item.property.id === s.propertyId));

  return (
    <div className="flex flex-col gap-4">
      {status === "loading" && lots.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">
          Loading parcels…
        </p>
      ) : null}
      {status === "error" && lots.length === 0 && state.error ? (
        <ErrorBanner message={state.error} onRetry={state.refresh} />
      ) : null}
      {status === "ready" && !hasMatch ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">
          Parcel outlines are not available for these lots.
        </p>
      ) : null}
      {hasMatch ? (
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PARCEL_SHAPES.map((shape) => {
            const change = changes.get(shape.propertyId);
            return (
              <li
                key={`${shape.propertyId}-${change ? `${change.from}-${change.to}-${change.unknownTo}` : "static"}`}
                className="min-w-0"
              >
                <ParcelCard
                  shape={shape}
                  verdict={verdictOf(shape.propertyId)}
                  selected={selectedId === shape.propertyId}
                  changed={change !== undefined}
                  onSelect={() => onSelect(shape.propertyId)}
                />
              </li>
            );
          })}
          <li className="min-w-0">
            <Legend />
          </li>
        </ul>
      ) : null}
      <p className="text-xs text-muted">
        Outlines: Sonoma County CDR_Parcels. Planning purposes only, not parcel-specific decisions.
      </p>
    </div>
  );
}

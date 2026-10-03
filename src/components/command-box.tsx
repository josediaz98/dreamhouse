"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { HouseProgram } from "@/lib/contract";
import { formatUsd, streetOf } from "@/lib/client/format";
import type { LotView } from "@/lib/client/use-lots";

export type CommandMode = "search" | "check";

/** What the buyer submits from the chips: the house program plus an optional budget. */
export interface SearchQuery {
  readonly program: HouseProgram;
  /** Null means no budget limit. */
  readonly maxPriceUsd: number | null;
}

type ChipKey = "stories" | "heightFt" | "footprintSqFt" | "deckSqFt" | "maxPriceUsd";

interface ChipSpec {
  readonly key: ChipKey;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit: string;
}

const CHIPS = [
  { key: "stories", label: "Stories", min: 1, max: 4, step: 1, unit: "stories" },
  { key: "heightFt", label: "Height", min: 8, max: 60, step: 1, unit: "ft" },
  { key: "footprintSqFt", label: "Footprint", min: 100, max: 20000, step: 5, unit: "sq ft" },
  { key: "deckSqFt", label: "Deck", min: 0, max: 5000, step: 10, unit: "sq ft" },
  { key: "maxPriceUsd", label: "Budget", min: 10000, max: 10000000, step: 5000, unit: "USD" },
] as const satisfies readonly ChipSpec[];

const MODES = [
  { key: "search", label: "Search lots" },
  { key: "check", label: "Check a lot" },
] as const satisfies readonly { readonly key: CommandMode; readonly label: string }[];

function chipValue(query: SearchQuery, key: ChipKey): number | null {
  return key === "maxPriceUsd" ? query.maxPriceUsd : query.program[key];
}

function chipText(query: SearchQuery, key: ChipKey): { readonly value: string; readonly rest: string } {
  const n = chipValue(query, key);
  switch (key) {
    case "stories":
      return { value: String(n), rest: n === 1 ? "story" : "stories" };
    case "heightFt":
      return { value: String(n), rest: "ft tall" };
    case "footprintSqFt":
      return { value: (n ?? 0).toLocaleString("en-US"), rest: "sq ft footprint" };
    case "deckSqFt":
      return { value: (n ?? 0).toLocaleString("en-US"), rest: "sq ft deck" };
    case "maxPriceUsd":
      return n === null ? { value: "any", rest: "price" } : { value: formatUsd(n), rest: "max" };
  }
}

function withChip(query: SearchQuery, key: ChipKey, value: number | null): SearchQuery {
  if (key === "maxPriceUsd") return { ...query, maxPriceUsd: value };
  if (value === null) return query;
  return { ...query, program: { ...query.program, [key]: value } };
}

function Chip({
  spec,
  query,
  open,
  onOpen,
  onClose,
  onChange,
}: {
  readonly spec: ChipSpec;
  readonly query: SearchQuery;
  readonly open: boolean;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onChange: (next: SearchQuery) => void;
}) {
  const current = chipValue(query, spec.key);
  const [draft, setDraft] = useState(current === null ? "" : String(current));
  const root = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const text = chipText(query, spec.key);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointer(event: PointerEvent) {
      if (root.current && event.target instanceof Node && !root.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, onClose]);

  function update(raw: string) {
    setDraft(raw);
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) return;
    const clamped = Math.min(spec.max, Math.max(spec.min, Math.round(n)));
    onChange(withChip(query, spec.key, clamped));
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${spec.label}: ${text.value} ${text.rest}. Edit`}
        onClick={() => {
          setDraft(current === null ? "" : String(current));
          if (open) onClose();
          else onOpen();
        }}
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors duration-150 ease-out-quint sm:min-h-10 ${
          open
            ? "border-accent bg-raised text-fg"
            : "border-line-strong bg-raised text-ink-200 hover:border-ink-500 hover:text-fg"
        }`}
      >
        {spec.key === "maxPriceUsd" && current !== null ? <span className="text-muted">under</span> : null}
        <span className="font-mono tabular-nums text-fg">{text.value}</span>
        <span>{spec.key === "maxPriceUsd" && current !== null ? "" : text.rest}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`Edit ${spec.label.toLowerCase()}`}
          className="popover-in absolute left-0 top-full z-20 mt-2 w-60 rounded-lg border border-line-strong bg-surface p-3 shadow-raised max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto"
        >
          <label htmlFor={inputId} className="label">
            {spec.label} ({spec.unit})
          </label>
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            autoFocus
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={draft}
            placeholder={spec.key === "maxPriceUsd" ? "No limit" : undefined}
            onChange={(e) => update(e.target.value)}
            className="mt-2 w-full rounded-md border border-line-strong bg-bg px-3 py-2 font-mono text-base tabular-nums text-fg placeholder:text-faint"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            {spec.key === "maxPriceUsd" ? (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  onChange(withChip(query, spec.key, null));
                }}
                className="min-h-11 rounded-md px-2 text-sm text-muted hover:text-fg sm:min-h-8"
              >
                No limit
              </button>
            ) : (
              <span className="text-xs text-faint">
                {spec.min.toLocaleString("en-US")}–{spec.max.toLocaleString("en-US")}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-line-strong px-3 text-sm text-fg hover:bg-raised sm:min-h-8"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface CommandBoxProps {
  readonly mode: CommandMode;
  readonly onModeChange: (mode: CommandMode) => void;
  readonly query: SearchQuery;
  readonly onQueryChange: (next: SearchQuery) => void;
  readonly lotQuery: string;
  readonly onLotQueryChange: (value: string) => void;
  /** Real, ingested lots offered as one-click presets in "Check a lot". */
  readonly presets: readonly LotView[];
  readonly onPreset: (lot: LotView) => void;
  readonly onSubmit: () => void;
  readonly busy: boolean;
}

export function CommandBox({
  mode,
  onModeChange,
  query,
  onQueryChange,
  lotQuery,
  onLotQueryChange,
  presets,
  onPreset,
  onSubmit,
  busy,
}: CommandBoxProps) {
  const [openChip, setOpenChip] = useState<ChipKey | null>(null);
  const lotInputId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpenChip(null);
    onSubmit();
  }

  const canSubmit = !busy && (mode === "search" || lotQuery.trim() !== "");

  return (
    <form
      onSubmit={submit}
      aria-label={mode === "search" ? "Search lots for a house program" : "Check one lot"}
      className="w-full max-w-[55rem] rounded-xl border border-line-strong bg-surface text-left shadow-raised"
    >
      <div className="min-h-28 px-4 pb-5 pt-4 sm:px-5 sm:pt-5">
        {mode === "search" ? (
          <>
            <p className="label">Your house</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CHIPS.map((spec) => (
                <Chip
                  key={spec.key}
                  spec={spec}
                  query={query}
                  open={openChip === spec.key}
                  onOpen={() => setOpenChip(spec.key)}
                  onClose={() => setOpenChip((v) => (v === spec.key ? null : v))}
                  onChange={onQueryChange}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <label htmlFor={lotInputId} className="label">
              Address or APN
            </label>
            <input
              id={lotInputId}
              value={lotQuery}
              onChange={(e) => onLotQueryChange(e.target.value)}
              placeholder={presets[0] ? streetOf(presets[0].item.property) : "35604 Timber Ridge Road"}
              autoComplete="off"
              autoFocus
              className="mt-2 w-full rounded-md border border-transparent bg-transparent px-0 py-1 text-lg text-fg placeholder:text-faint focus-visible:outline-offset-4"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-faint">Try</span>
              {presets.map((lot) => (
                <button
                  key={lot.item.property.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onPreset(lot)}
                  className="min-h-11 rounded-md border border-line-strong bg-raised px-3 text-sm text-ink-200 transition-colors duration-150 hover:text-fg disabled:opacity-50 sm:min-h-9"
                >
                  {streetOf(lot.item.property)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line p-2.5 sm:px-3">
        <div
          role="tablist"
          aria-label="Mode"
          className="flex flex-1 rounded-md border border-line bg-bg p-0.5 sm:flex-none"
        >
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => {
                setOpenChip(null);
                onModeChange(key);
              }}
              className={`min-h-11 flex-1 rounded-[5px] px-3.5 text-sm transition-colors duration-150 ease-out-quint sm:min-h-9 sm:flex-none ${
                mode === key ? "bg-raised text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="hidden flex-1 text-right font-mono text-xs text-faint sm:block">
          {busy ? "Running…" : "Enter ↵"}
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label={mode === "search" ? "Search lots" : "Check this lot"}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink transition-colors duration-150 ease-out-quint hover:bg-accent-strong disabled:opacity-50"
        >
          {busy ? (
            <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-accent-ink border-t-transparent" />
          ) : (
            <svg aria-hidden viewBox="0 0 20 20" className="size-5">
              <path
                d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useRef, useState, type FormEvent } from "react";
import type {
  BuildabilityResult,
  Property,
  TraceEvent,
  TraceStatus,
  Verdict,
} from "@/lib/contract";
import {
  askSeller,
  checkBuildability,
  getSpec,
  listCalls,
  listQuestions,
  USE_FIXTURES,
} from "@/lib/client/api";
import { formatCallUsd, formatMs, median, streetOf } from "@/lib/client/format";
import type { LotView } from "@/lib/client/use-lots";
import { DEFAULT_PROGRAM, FIELD_FOR_RULE } from "@/lib/client/types";
import { DemoBadge } from "@/components/demo-badge";
import { TracePanel, type TraceQuestion } from "@/components/trace-panel";
import { VerdictList } from "@/components/verdict-list";

type Phase = "idle" | "running" | "done" | "error";

const VERDICT_TO_TRACE: Record<Verdict, TraceStatus> = {
  pass: "ok",
  fail: "fail",
  unknown: "unknown",
};

function matchLot(query: string, lots: readonly LotView[]): LotView | null {
  const needle = query.trim().toLowerCase();
  if (needle === "") return null;
  return (
    lots.find(({ item }) => {
      const { id, apn, address } = item.property;
      return (
        id.toLowerCase() === needle ||
        (apn !== null && apn.toLowerCase() === needle) ||
        address.toLowerCase().includes(needle)
      );
    }) ?? null
  );
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

function timedSync<T>(fn: () => T): { value: T; ms: number } {
  const start = performance.now();
  const value = fn();
  return { value, ms: performance.now() - start };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

interface PlaygroundProps {
  readonly lots: readonly LotView[];
  readonly loading: boolean;
}

export function Playground({ lots, loading }: PlaygroundProps) {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [events, setEvents] = useState<readonly TraceEvent[]>([]);
  const [questions, setQuestions] = useState<Readonly<Record<string, TraceQuestion>>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [result, setResult] = useState<BuildabilityResult | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [timings, setTimings] = useState<readonly number[]>([]);
  const [medianCost, setMedianCost] = useState<number | null>(null);
  const runId = useRef(0);

  const chips = [...lots]
    .sort((a, b) => a.item.property.address.localeCompare(b.item.property.address))
    .slice(0, 3);
  const p50 = median(timings);

  function upsert(event: TraceEvent) {
    setEvents((prev) =>
      prev.some((e) => e.id === event.id)
        ? prev.map((e) => (e.id === event.id ? event : e))
        : [...prev, event],
    );
  }

  async function run(rawQuery: string) {
    const id = ++runId.current;
    const current = () => runId.current === id;
    setPhase("running");
    setEvents([]);
    setQuestions({});
    setSummary(null);
    setResult(null);
    setProperty(null);
    setMessage(null);

    upsert({ id: "resolve", tool: "resolve_parcel", status: "running", label: `"${rawQuery}"`, ms: null });
    const { value: match, ms: resolveMs } = timedSync(() => matchLot(rawQuery, lots));
    if (!match) {
      upsert({
        id: "resolve",
        tool: "resolve_parcel",
        status: "fail",
        label: "no indexed lot matches",
        ms: resolveMs,
      });
      setPhase("error");
      setMessage("No indexed lot matches that input. Pick one of the lots above.");
      return;
    }
    const lot = match.item.property;
    setProperty(lot);
    upsert({
      id: "resolve",
      tool: "resolve_parcel",
      status: "ok",
      label: `${streetOf(lot)} → ${lot.apn ?? lot.id}`,
      ms: resolveMs,
    });

    const spent: number[] = [];
    try {
      upsert({ id: "check", tool: "check_buildability", status: "running", label: "rules vs house program", ms: null });
      const check = await timed(() =>
        checkBuildability({ propertyId: lot.id, program: DEFAULT_PROGRAM }),
      );
      if (!current()) return;
      spent.push(check.ms);
      let final = check.value;
      setResult(final);
      upsert({
        id: "check",
        tool: "check_buildability",
        status: VERDICT_TO_TRACE[final.overall],
        label: `${final.overall} · ${plural(final.unknownCount, "unknown")}`,
        ms: check.ms,
      });

      upsert({ id: "spec", tool: "get_spec", status: "running", label: "fields with provenance", ms: null });
      const spec = await timed(() => getSpec({ propertyId: lot.id }));
      if (!current()) return;
      spent.push(spec.ms);
      const known = spec.value.fields.filter((f) => f.status === "known").length;
      upsert({
        id: "spec",
        tool: "get_spec",
        status: "ok",
        label: `${known} of ${spec.value.fields.length} fields known`,
        ms: spec.ms,
      });

      // The unknowns become seller questions: the signature beat of the demo.
      let drafted = final.checks.filter((c) => c.verdict === "unknown" && c.questionId !== null).length;
      // A lot already ruled out by a hard rule does not need seller questions.
      const worthAsking = final.overall !== "fail";
      // Never ask twice for the same lot and field: reuse a question that is still open.
      const openQuestions = worthAsking
        ? await listQuestions("open").catch(() => [] as const)
        : [];
      if (!current()) return;
      for (const item of final.checks) {
        if (!worthAsking || item.verdict !== "unknown" || item.questionId !== null) continue;
        const eventId = `ask-${item.rule}`;
        const existing = openQuestions.find(
          (q) => q.propertyId === lot.id && q.fieldKey === FIELD_FOR_RULE[item.rule],
        );
        if (existing) {
          drafted += 1;
          final = {
            ...final,
            checks: final.checks.map((c) =>
              c.rule === item.rule ? { ...c, questionId: existing.id } : c,
            ),
          };
          setResult(final);
          upsert({
            id: eventId,
            tool: "ask_seller",
            status: "unknown",
            label: `${FIELD_FOR_RULE[item.rule]} unknown · question already open`,
            ms: null,
          });
          setQuestions((prev) => ({ ...prev, [eventId]: { text: existing.text, reused: true } }));
          continue;
        }
        upsert({ id: eventId, tool: "ask_seller", status: "running", label: FIELD_FOR_RULE[item.rule], ms: null });
        const text = `Can the seller confirm ${item.label.toLowerCase()}? ${item.detail}`;
        const asked = await timed(() =>
          askSeller({ propertyId: lot.id, fieldKey: FIELD_FOR_RULE[item.rule], text }),
        );
        if (!current()) return;
        spent.push(asked.ms);
        drafted += 1;
        final = {
          ...final,
          checks: final.checks.map((c) =>
            c.rule === item.rule ? { ...c, questionId: asked.value.question.id } : c,
          ),
        };
        setResult(final);
        upsert({
          id: eventId,
          tool: "ask_seller",
          status: "unknown",
          label: `${FIELD_FOR_RULE[item.rule]} unknown`,
          ms: asked.ms,
        });
        setQuestions((prev) => ({
          ...prev,
          [eventId]: { text: asked.value.question.text, reused: false },
        }));
      }

      setSummary(
        final.overall === "fail"
          ? "Ruled out by a hard rule: no site visit, no seller questions."
          : final.unknownCount === 0
            ? "No unknowns: every rule has a sourced answer."
            : `${plural(final.unknownCount, "unknown")} → ${plural(drafted, "seller question")} drafted`,
      );
      setTimings((prev) => [...prev, ...spent]);
      setPhase("done");

      try {
        const calls = await listCalls();
        setMedianCost(median(calls.map((c) => c.amountUsd).filter((amount) => amount > 0)));
      } catch {
        // Cost line stays at its previous value; the verdict is already on screen.
      }
    } catch (e) {
      if (!current()) return;
      setPhase("error");
      setMessage(e instanceof Error ? e.message : "The call failed");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(query);
  }

  function pick(lot: Property) {
    setQuery(lot.address);
    void run(lot.address);
  }

  const running = phase === "running";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor="lot-input" className="text-sm font-medium text-fg">
            Lot address or APN
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="lot-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={chips[0] ? streetOf(chips[0].item.property) : "Address or APN"}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={running || loading}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink hover:bg-accent-strong disabled:opacity-50"
            >
              {running ? "Checking…" : "Check buildability"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-label="Preset lots">
            <span className="text-xs text-muted">Presets</span>
            {loading && chips.length === 0 ? (
              <span className="text-xs text-muted">Loading lots…</span>
            ) : null}
            {chips.map(({ item }) => (
              <button
                key={item.property.id}
                type="button"
                disabled={running}
                onClick={() => pick(item.property)}
                className="rounded-full border border-line-strong px-3 py-1 text-xs text-fg hover:bg-raised disabled:opacity-50"
              >
                {streetOf(item.property)}
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-muted">
            House program: {DEFAULT_PROGRAM.footprintSqFt.toLocaleString("en-US")} sq ft +{" "}
            {DEFAULT_PROGRAM.deckSqFt} sq ft deck · {DEFAULT_PROGRAM.heightFt} ft ·{" "}
            {DEFAULT_PROGRAM.stories} stories
          </p>
        </form>

        {message ? (
          <p role="alert" className="rounded-lg border border-fail-line bg-fail-soft px-4 py-3 text-sm text-fg">
            {message}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-2">
            {property ? (
              <p className="text-sm text-muted">
                {property.address}
                {property.isFixture ? (
                  <>
                    {" "}
                    <DemoBadge />
                  </>
                ) : null}
              </p>
            ) : null}
            <VerdictList result={result} />
          </div>
        ) : null}

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
          <span>p50 latency {p50 === null ? "—" : formatMs(p50)}</span>
          <span>
            cost per paid call {medianCost === null ? "—" : formatCallUsd(medianCost)}
          </span>
          {USE_FIXTURES ? <DemoBadge /> : null}
        </p>
      </div>

      <div className="min-w-0">
        <TracePanel events={events} questions={questions} summary={summary} />
      </div>
    </div>
  );
}

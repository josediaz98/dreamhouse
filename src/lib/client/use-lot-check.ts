"use client";

import { useRef, useState } from "react";
import type {
  BuildabilityResult,
  HouseProgram,
  Property,
  TraceEvent,
  TraceStatus,
  Verdict,
} from "@/lib/contract";
import { askSeller, checkBuildability, getSpec, listCalls, listQuestions } from "@/lib/client/api";
import { plainError } from "@/lib/client/errors";
import { median, streetOf } from "@/lib/client/format";
import { FIELD_FOR_RULE } from "@/lib/client/types";
import type { LotView } from "@/lib/client/use-lots";

export type CheckPhase = "idle" | "running" | "done" | "error";

/** Seller question shown under the trace event that created or found it. */
export interface CheckQuestion {
  readonly text: string;
  /** True when an open question already existed, so nothing new was drafted. */
  readonly reused: boolean;
}

export interface LotCheckState {
  readonly phase: CheckPhase;
  readonly events: readonly TraceEvent[];
  readonly questions: Readonly<Record<string, CheckQuestion>>;
  readonly summary: string | null;
  readonly result: BuildabilityResult | null;
  readonly property: Property | null;
  /** One plain sentence when the run failed or no lot matched. */
  readonly message: string | null;
  /** The query to retry, set only when the failure was a network or API error. */
  readonly lastQuery: string | null;
  /** Wall-clock milliseconds of every tool call so far. */
  readonly timings: readonly number[];
  readonly medianCost: number | null;
  readonly run: (rawQuery: string, program: HouseProgram) => Promise<void>;
  readonly reset: () => void;
}

const VERDICT_TO_TRACE: Record<Verdict, TraceStatus> = {
  pass: "ok",
  fail: "fail",
  unknown: "unknown",
};

export function matchLot(query: string, lots: readonly LotView[]): LotView | null {
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

/**
 * The single-lot agent run: resolve → check_buildability → get_spec → ask_seller for each
 * unknown. It writes only on an explicit user action, and it reuses a question that is
 * already open for the same lot and field instead of drafting a second one.
 */
export function useLotCheck(lots: readonly LotView[]): LotCheckState {
  const [phase, setPhase] = useState<CheckPhase>("idle");
  const [events, setEvents] = useState<readonly TraceEvent[]>([]);
  const [questions, setQuestions] = useState<Readonly<Record<string, CheckQuestion>>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [result, setResult] = useState<BuildabilityResult | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [timings, setTimings] = useState<readonly number[]>([]);
  const [medianCost, setMedianCost] = useState<number | null>(null);
  const runId = useRef(0);

  function upsert(event: TraceEvent) {
    setEvents((prev) =>
      prev.some((e) => e.id === event.id)
        ? prev.map((e) => (e.id === event.id ? event : e))
        : [...prev, event],
    );
  }

  function reset() {
    runId.current += 1;
    setPhase("idle");
    setEvents([]);
    setQuestions({});
    setSummary(null);
    setResult(null);
    setProperty(null);
    setMessage(null);
    setLastQuery(null);
  }

  async function run(rawQuery: string, program: HouseProgram) {
    const id = ++runId.current;
    const current = () => runId.current === id;
    setPhase("running");
    setEvents([]);
    setQuestions({});
    setSummary(null);
    setResult(null);
    setProperty(null);
    setMessage(null);
    setLastQuery(null);

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
      setMessage("No indexed lot matches that input. Pick one of the lots below the box.");
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
      const check = await timed(() => checkBuildability({ propertyId: lot.id, program }));
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
      let drafted = 0;
      let reused = final.checks.filter((c) => c.verdict === "unknown" && c.questionId !== null).length;
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
          reused += 1;
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
            : `${plural(final.unknownCount, "unknown")} → ${plural(drafted + reused, "seller question")} ${drafted === 0 ? "open" : "drafted"}`,
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
      setMessage(plainError(e, "run the check"));
      setLastQuery(rawQuery);
    }
  }

  return {
    phase,
    events,
    questions,
    summary,
    result,
    property,
    message,
    lastQuery,
    timings,
    medianCost,
    run,
    reset,
  };
}

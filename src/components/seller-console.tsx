"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Question } from "@/lib/contract";
import { USE_FIXTURES, listQuestions } from "@/lib/client/api";
import { plainError } from "@/lib/client/errors";
import { resetFixtureState } from "@/lib/client/fixture-store";
import { subscribeToChanges } from "@/lib/client/realtime";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { useLots, type LotView } from "@/lib/client/use-lots";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";
import { BuyerView } from "@/components/seller/buyer-view";
import { QuestionGroup, type QuestionGroupData } from "@/components/seller/question-group";

/** One group per lot, in API order; lots with no open question go last. */
function groupQuestions(
  questions: readonly Question[],
  lots: readonly LotView[],
  loading: boolean,
): QuestionGroupData[] {
  const byLot = new Map<string, Question[]>();
  for (const q of questions) {
    const list = byLot.get(q.propertyId);
    if (list) list.push(q);
    else byLot.set(q.propertyId, [q]);
  }
  const groups = [...byLot.entries()].map(([propertyId, list]): QuestionGroupData => {
    const lot = lots.find(({ item }) => item.property.id === propertyId);
    const [street, ...rest] = lot ? lot.item.property.address.split(",") : [];
    return {
      propertyId,
      street: street?.trim() || (loading ? "Loading lot…" : "Lot not in the current search"),
      locality: rest.length > 0 ? rest.join(",").trim() : null,
      verdict: lot?.result?.overall ?? lot?.item.overall ?? "unknown",
      questions: list,
    };
  });
  const hasOpen = (g: QuestionGroupData) => g.questions.some((q) => q.status === "open");
  return [...groups.filter(hasOpen), ...groups.filter((g) => !hasOpen(g))];
}

export function SellerConsole() {
  const lotsState = useLots(DEFAULT_PROGRAM);
  const [questions, setQuestions] = useState<readonly Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refetch = () => {
      listQuestions()
        .then((next) => {
          if (cancelled) return;
          setQuestions(next);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(plainError(e, "load the seller questions"));
        });
    };
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [reload]);

  const load = () => setReload((n) => n + 1);
  const groups = groupQuestions(questions ?? [], lotsState.lots, lotsState.status === "loading");
  const openTotal = questions?.filter((q) => q.status === "open").length ?? 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl text-fg sm:text-4xl">Seller console</h1>
          <p className="mt-2 text-base text-muted">
            Questions agents could not answer from the listing or the rules. Your answer updates the spec and
            re-ranks the buyer&apos;s list.
          </p>
          <p className="mt-2 font-mono text-xs text-faint">Demo: answers are entered by the presenter.</p>
        </div>
        {USE_FIXTURES ? (
          <div className="flex items-center gap-2">
            <DemoBadge />
            <button
              type="button"
              onClick={resetFixtureState}
              className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg hover:bg-raised max-sm:min-h-11"
            >
              Reset demo
            </button>
          </div>
        ) : null}
      </header>

      <div className="grid gap-10 lg:grid-cols-[11fr_9fr] lg:gap-8">
        <section aria-labelledby="questions-heading" className="flex min-w-0 flex-col gap-3">
          <h2 id="questions-heading" className="text-xl text-fg sm:text-2xl">
            Open questions{" "}
            <span className="font-mono text-base tabular-nums text-faint">
              ({questions === null ? "…" : openTotal})
            </span>
          </h2>

          {error ? <ErrorBanner message={error} onRetry={load} /> : null}
          {questions === null && !error ? <p className="text-sm text-muted">Loading questions…</p> : null}
          {questions !== null && groups.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">
              No open questions. Run a lot on the{" "}
              <Link href="/#demo" className="text-accent underline underline-offset-2">
                buyer page
              </Link>{" "}
              to draft some.
            </p>
          ) : null}

          <ul className="flex flex-col gap-4">
            {groups.map((group) => (
              <QuestionGroup key={group.propertyId} group={group} onAnswered={load} />
            ))}
          </ul>
        </section>

        <div className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <BuyerView state={lotsState} />
        </div>
      </div>
    </div>
  );
}

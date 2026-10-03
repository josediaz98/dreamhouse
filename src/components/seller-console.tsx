"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Question } from "@/lib/contract";
import { USE_FIXTURES, answerQuestion, listQuestions } from "@/lib/client/api";
import { resetFixtureState } from "@/lib/client/fixture-store";
import { streetOf } from "@/lib/client/format";
import { subscribeToChanges } from "@/lib/client/realtime";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { useLots } from "@/lib/client/use-lots";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";
import { RankedLots } from "@/components/ranked-lots";

function QuestionCard({
  question,
  address,
  onAnswered,
}: {
  readonly question: Question;
  readonly address: string;
  readonly onAnswered: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `answer-${question.id}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = answer.trim();
    if (text === "") return;
    setSubmitting(true);
    setError(null);
    try {
      await answerQuestion(question.id, text);
      onAnswered();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the answer");
      setSubmitting(false);
    }
  }

  return (
    <li className="rounded-lg border border-unknown bg-surface p-4">
      <p className="text-sm font-medium text-fg">{address}</p>
      <p className="mt-0.5 font-mono text-xs text-unknown">{question.fieldKey} · unknown</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm text-fg">
          {question.text}
        </label>
        <textarea
          id={inputId}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={2}
          placeholder="Type the seller's answer"
          className="w-full rounded-md border border-line-strong bg-page px-3 py-2 text-sm text-fg placeholder:text-muted"
        />
        {error ? <ErrorBanner message={error} /> : null}
        <button
          type="submit"
          disabled={submitting || answer.trim() === ""}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover-accent-strong disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send answer"}
        </button>
      </form>
    </li>
  );
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
          if (!cancelled) setError(e instanceof Error ? e.message : "Could not load questions");
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

  const addressOf = (propertyId: string): string => {
    const lot = lotsState.lots.find(({ item }) => item.property.id === propertyId);
    return lot ? lot.item.property.address : propertyId;
  };
  const open = questions?.filter((q) => q.status === "open") ?? [];
  const answered = questions?.filter((q) => q.status === "answered") ?? [];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <section aria-labelledby="open-heading" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 id="open-heading" className="text-2xl font-semibold tracking-tight text-fg">
              Seller console
            </h1>
            <p className="mt-1 text-sm text-muted">
              Questions agents could not answer from the listing or the rules. Your answer updates
              the spec and re-ranks the buyer view.
            </p>
          </div>
          {USE_FIXTURES ? (
            <div className="flex items-center gap-2">
              <DemoBadge />
              <button
                type="button"
                onClick={resetFixtureState}
                className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg hover-surface-2"
              >
                Reset demo
              </button>
            </div>
          ) : null}
        </div>

        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
        {questions === null && !error ? (
          <p className="text-sm text-muted">Loading questions…</p>
        ) : null}
        {questions !== null && open.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-6 text-sm text-muted">
            No open questions. Run a lot on the{" "}
            <Link href="/#demo" className="text-accent underline underline-offset-2">
              buyer page
            </Link>{" "}
            to draft some.
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {open.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              address={addressOf(question.propertyId)}
              onAnswered={load}
            />
          ))}
        </ul>

        {answered.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="font-mono text-xs uppercase tracking-wide text-muted">Answered</h2>
            <ul className="flex flex-col gap-2">
              {answered.map((question) => (
                <li
                  key={question.id}
                  className="rounded-lg border border-pass bg-pass-soft px-4 py-3 text-sm"
                >
                  <p className="font-medium text-fg">
                    {streetOf({ address: addressOf(question.propertyId) })} ·{" "}
                    <span className="font-mono text-xs text-pass">{question.fieldKey} → known</span>
                  </p>
                  <p className="mt-1 break-words text-muted">{question.answer}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="min-w-0">
        <RankedLots state={lotsState} compact />
      </div>
    </div>
  );
}

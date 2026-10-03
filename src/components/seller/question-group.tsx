"use client";

import { useState, type FormEvent } from "react";
import type { Question, Verdict } from "@/lib/contract";
import { answerQuestion } from "@/lib/client/api";
import { plainError } from "@/lib/client/errors";
import { ErrorBanner } from "@/components/error-banner";
import { LotAerial } from "@/components/lot-aerial";
import { DEMO_ANSWERS, FIELD_LABEL } from "@/components/seller/field-labels";

export interface QuestionGroupData {
  readonly propertyId: string;
  readonly street: string;
  readonly locality: string | null;
  readonly verdict: Verdict;
  readonly questions: readonly Question[];
}

export function OpenRow({ question, onAnswered }: { readonly question: Question; readonly onAnswered: () => void }) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `answer-${question.id}`;
  const label = FIELD_LABEL[question.fieldKey];
  const demo = DEMO_ANSWERS[question.fieldKey] ?? [];

  async function send() {
    const text = answer.trim();
    if (text === "" || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await answerQuestion(question.id, text);
      onAnswered();
    } catch (e) {
      setError(plainError(e, "send the answer"));
      setSubmitting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  return (
    <li className="flex flex-col gap-2.5 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-1">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="font-mono text-xs text-unknown">
            ?
          </span>
          <span className="text-sm font-semibold text-fg">{label}</span>
        </span>
        <label htmlFor={inputId} className="text-sm text-muted">
          {question.text}
        </label>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type the seller's answer"
          autoComplete="off"
          enterKeyHint="send"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-bg px-3 text-sm text-fg placeholder:text-faint sm:min-h-10"
        />
        <button
          type="submit"
          disabled={submitting || answer.trim() === ""}
          className="min-h-11 shrink-0 rounded-md bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-strong disabled:opacity-40 sm:min-h-10"
        >
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>
      {demo.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="label text-faint">Demo answers</span>
          {demo.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => setAnswer(text)}
              className="min-h-11 rounded-full border border-line-strong px-3 text-xs text-muted transition-colors duration-150 hover:border-ink-500 hover:text-fg sm:min-h-7"
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <ErrorBanner message={`${error} Your text is still here.`} onRetry={() => void send()} /> : null}
    </li>
  );
}

export function AnsweredRow({ question }: { readonly question: Question }) {
  return (
    <li className="flex items-baseline gap-3 px-4 py-3 sm:px-5">
      <span aria-hidden className="font-mono text-sm text-pass">
        ✓
      </span>
      <span className="min-w-0 text-sm">
        <span className="font-semibold text-fg">{FIELD_LABEL[question.fieldKey]}</span>
        <span className="sr-only"> answered:</span>
        <span className="text-faint"> · </span>
        <span className="break-words text-muted">{question.answer}</span>
      </span>
    </li>
  );
}

export function QuestionGroup({
  group,
  onAnswered,
}: {
  readonly group: QuestionGroupData;
  readonly onAnswered: () => void;
}) {
  const open = group.questions.filter((q) => q.status === "open");
  const answered = group.questions.filter((q) => q.status === "answered");
  const headingId = `group-${group.propertyId}`;

  return (
    <li
      aria-labelledby={headingId}
      className={`overflow-hidden rounded-lg bg-surface ${open.length > 0 ? "unknown-edge" : "border border-line"}`}
    >
      <div className="flex items-center gap-4 border-b border-line p-4 sm:px-5">
        <LotAerial
          propertyId={group.propertyId}
          address={group.street}
          verdict={group.verdict}
          variant="thumb"
          className="aspect-[3/2] w-28 shrink-0 rounded-md sm:w-32"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="break-words font-sans text-base font-medium text-fg">
            {group.street}
          </h2>
          {group.locality ? <p className="text-sm text-faint">{group.locality}</p> : null}
          <p className={`font-mono text-xs tabular-nums ${open.length > 0 ? "text-unknown" : "text-pass"}`}>
            {open.length > 0
              ? `${open.length} open ${open.length === 1 ? "question" : "questions"}`
              : "All questions answered"}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-line">
        {open.map((q) => (
          <OpenRow key={q.id} question={q} onAnswered={onAnswered} />
        ))}
        {answered.map((q) => (
          <AnsweredRow key={q.id} question={q} />
        ))}
      </ul>
    </li>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { Question, Verdict } from "@/lib/contract";
import { listQuestions } from "@/lib/client/api";
import { plainError } from "@/lib/client/errors";
import { subscribeToChanges } from "@/lib/client/realtime";
import { DEFAULT_PROGRAM } from "@/lib/client/types";
import { useLots, type LotView, type LotsState } from "@/lib/client/use-lots";

export interface SellerData {
  readonly lots: LotsState;
  /** Null until the first load. */
  readonly questions: readonly Question[] | null;
  readonly questionsError: string | null;
  readonly reloadQuestions: () => void;
}

/** Live lots (demo program) + live seller questions. Read-only: nothing is written on load. */
export function useSellerData(): SellerData {
  const lots = useLots(DEFAULT_PROGRAM);
  const [questions, setQuestions] = useState<readonly Question[] | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const refetch = () => {
      listQuestions()
        .then((next) => {
          if (cancelled) return;
          setQuestions(next);
          setQuestionsError(null);
        })
        .catch((e: unknown) => {
          if (!cancelled) setQuestionsError(plainError(e, "load the seller questions"));
        });
    };
    refetch();
    const unsubscribe = subscribeToChanges(refetch);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [reload]);

  const reloadQuestions = useCallback(() => setReload((n) => n + 1), []);
  return { lots, questions, questionsError, reloadQuestions };
}

export function verdictOf(lot: LotView): Verdict {
  return lot.result?.overall ?? lot.item.overall ?? "unknown";
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

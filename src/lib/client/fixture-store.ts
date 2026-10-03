/**
 * In-browser stand-in for the Back while NEXT_PUBLIC_USE_FIXTURES=1.
 * State lives in localStorage so the buyer tab and the seller tab see the same data, and
 * the `storage` event doubles as the cross-tab realtime channel.
 */
import type {
  BuildabilityResult,
  CallReceipt,
  McpToolName,
  Question,
  RuleCheck,
  SourceRef,
  SpecField,
  Verdict,
} from "@/lib/contract";
import {
  FIXTURE_FIELDS,
  FIXTURE_QUESTIONS,
  FIXTURE_RESULTS,
} from "@/lib/fixtures";
import { FIELD_FOR_RULE, type ChangeEvent, type ChangeHandler } from "@/lib/client/types";

export interface FixtureState {
  readonly questions: readonly Question[];
  readonly fields: readonly SpecField[];
  readonly results: readonly BuildabilityResult[];
  readonly calls: readonly CallReceipt[];
}

/** Model state. Only this key fires the cross-tab change event. */
const STORAGE_KEY = "dreamhouse.fixtures.v1";
/** Call log lives apart so logging a call never notifies other tabs (that would loop). */
const CALLS_KEY = "dreamhouse.fixtures.calls.v1";

const SELLER_SOURCE: SourceRef = {
  type: "seller",
  url: null,
  page: null,
  label: "Seller answer",
};

/** Sandbox amounts per tool. Demo data, not a price list. */
const CALL_PRICE_USD: Record<McpToolName, number> = {
  search_properties: 0.002,
  get_spec: 0.005,
  check_buildability: 0.01,
  ask_seller: 0,
};

function initialState(): FixtureState {
  return {
    questions: FIXTURE_QUESTIONS,
    fields: FIXTURE_FIELDS,
    results: FIXTURE_RESULTS,
    calls: [],
  };
}

function isState(value: unknown): value is FixtureState {
  if (typeof value !== "object" || value === null) return false;
  return (
    "questions" in value &&
    Array.isArray(value.questions) &&
    "fields" in value &&
    Array.isArray(value.fields) &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

let memory: FixtureState | null = null;

function readCalls(): readonly CallReceipt[] {
  try {
    const raw = window.localStorage.getItem(CALLS_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as CallReceipt[];
    }
  } catch {
    // Fall through to an empty log.
  }
  return [];
}

export function loadState(): FixtureState {
  const calls = readCalls();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (isState(parsed)) {
        memory = { ...parsed, calls };
        return memory;
      }
    }
  } catch {
    // Storage blocked or corrupt: fall back to the in-memory copy.
  }
  memory = { ...(memory ?? initialState()), calls };
  return memory;
}

const listeners = new Set<ChangeHandler>();

function save(next: FixtureState, event: ChangeEvent | null): void {
  memory = next;
  try {
    const { questions, fields, results } = next;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ questions, fields, results }));
  } catch {
    // Same-tab flow still works from memory.
  }
  if (event !== null) listeners.forEach((handler) => handler(event));
}

export function resetFixtureState(): void {
  try {
    window.localStorage.removeItem(CALLS_KEY);
  } catch {
    // Nothing to clear.
  }
  save(initialState(), { table: "questions", propertyId: null });
}

export function subscribeFixtureChanges(handler: ChangeHandler): () => void {
  listeners.add(handler);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === STORAGE_KEY) {
      memory = null;
      handler({ table: "questions", propertyId: null });
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(handler);
    window.removeEventListener("storage", onStorage);
  };
}

let callSeq = 0;

export function recordCall(tool: McpToolName): void {
  const state = loadState();
  const seq = `${Date.now().toString(36)}${(callSeq++).toString(36)}`;
  const receipt: CallReceipt = {
    id: `fx-call-${seq}`,
    agentId: "demo-agent",
    tool,
    amountUsd: CALL_PRICE_USD[tool],
    paymentRef: CALL_PRICE_USD[tool] > 0 ? `fx_mpp_${seq}` : null,
    ts: new Date().toISOString(),
  };
  // Latest first, capped so localStorage stays small.
  const calls = [receipt, ...state.calls].slice(0, 50);
  memory = { ...state, calls };
  try {
    window.localStorage.setItem(CALLS_KEY, JSON.stringify(calls));
  } catch {
    // The log is cosmetic; the flow keeps working.
  }
}

function rollup(checks: readonly RuleCheck[]): {
  overall: Verdict;
  unknownCount: number;
  openQuestionIds: string[];
} {
  const unknownCount = checks.filter((c) => c.verdict === "unknown").length;
  const overall: Verdict = checks.some((c) => c.verdict === "fail")
    ? "fail"
    : unknownCount > 0
      ? "unknown"
      : "pass";
  const openQuestionIds = checks.flatMap((c) => (c.questionId === null ? [] : [c.questionId]));
  return { overall, unknownCount, openQuestionIds };
}

function withChecks(
  result: BuildabilityResult,
  checks: readonly RuleCheck[],
): BuildabilityResult {
  return { ...result, checks, ...rollup(checks) };
}

/** Fixture-only simulation. The real Back computes the verdict from the rules table. */
export function applyAsk(
  propertyId: string,
  fieldKey: Question["fieldKey"],
  text: string,
): Question {
  const state = loadState();
  const existing = state.questions.find(
    (q) => q.propertyId === propertyId && q.fieldKey === fieldKey && q.status === "open",
  );
  if (existing) return existing;

  const question: Question = {
    id: `fx-q-${Date.now().toString(36)}`,
    propertyId,
    fieldKey,
    text,
    status: "open",
    answer: null,
    answeredAt: null,
  };
  const results = state.results.map((result) => {
    if (result.propertyId !== propertyId) return result;
    let linked = false;
    const checks = result.checks.map((check) => {
      if (
        !linked &&
        check.verdict === "unknown" &&
        check.questionId === null &&
        FIELD_FOR_RULE[check.rule] === fieldKey
      ) {
        linked = true;
        return { ...check, questionId: question.id };
      }
      return check;
    });
    return withChecks(result, checks);
  });
  save({ ...state, questions: [...state.questions, question], results }, {
    table: "questions",
    propertyId,
  });
  return question;
}

export function applyAnswer(questionId: string, answer: string): Question | null {
  const state = loadState();
  const target = state.questions.find((q) => q.id === questionId);
  if (!target) return null;

  const answered: Question = {
    ...target,
    status: "answered",
    answer,
    answeredAt: new Date().toISOString(),
  };
  const questions = state.questions.map((q) => (q.id === questionId ? answered : q));

  const answeredField: SpecField = {
    propertyId: target.propertyId,
    key: target.fieldKey,
    value: answer,
    status: "known",
    source: SELLER_SOURCE,
    confidence: null,
    note: null,
  };
  const hasField = state.fields.some(
    (f) => f.propertyId === target.propertyId && f.key === target.fieldKey,
  );
  const fields = hasField
    ? state.fields.map((f) =>
        f.propertyId === target.propertyId && f.key === target.fieldKey ? answeredField : f,
      )
    : [...state.fields, answeredField];

  const results = state.results.map((result) => {
    if (result.propertyId !== target.propertyId) return result;
    const checks = result.checks.map((check): RuleCheck =>
      check.questionId === questionId
        ? {
            ...check,
            verdict: "pass",
            detail: `Seller answered: "${answer}"`,
            actual: answer,
            sources: [SELLER_SOURCE],
            questionId: null,
          }
        : check,
    );
    return withChecks(result, checks);
  });

  save({ ...state, questions, fields, results }, {
    table: "questions",
    propertyId: target.propertyId,
  });
  return answered;
}

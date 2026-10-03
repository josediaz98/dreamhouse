"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_PROGRAM } from "@/lib/client/types";

/** Window events shared by the header and the landing workspace. Client-only, no writes. */
export const TOUR_EVENT = "lotline:tour";
export const CONNECT_EVENT = "lotline:connect";
export const TOUR_STORAGE_KEY = "lotline.tour.v1";

type Step = 0 | 1 | 2;
const STEP_COUNT = 3;

interface OnboardingModalProps {
  readonly open: boolean;
  /** Indexed lots from the live API; null while loading. */
  readonly lotCount: number | null;
  readonly onClose: () => void;
  /** Close the modal and run the default search, as the command box arrow does. */
  readonly onSearch: () => void;
  /** Close the modal and open the header "Connect your agent" popover. */
  readonly onConnect: () => void;
}

const FLOW = [
  {
    name: "Ingest",
    text: "Claude extracts each listing into typed fields, and every field keeps its source and page.",
  },
  {
    name: "Decide",
    text: "Deterministic rules from the Design Manual and county GIS return pass, fail or unknown. The model never decides.",
  },
  {
    name: "Ask",
    text: "Each unknown becomes a question to the seller, and the answer updates the verdict live.",
  },
] as const;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Marks the word "unknown" in the unknown token colour with a dashed underline. */
function WithUnknown({ text }: { readonly text: string }) {
  const parts = text.split(/\b(unknown)\b/i);
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === "unknown" ? (
          <span
            key={i}
            className="text-unknown underline decoration-unknown decoration-dashed decoration-1 underline-offset-4"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function StepCompare() {
  const p = DEFAULT_PROGRAM;
  return (
    <div className="flex flex-col gap-3">
      <p className="truncate font-mono text-xs text-faint" title="Prompt">
        “Can I build a {p.stories}-story house, {p.heightFt} ft tall, with a{" "}
        {p.footprintSqFt.toLocaleString("en-US")} sq ft footprint and a {p.deckSqFt} sq ft deck on 39463 Leeward Road,
        The Sea Ranch (0.39 ac)?”
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col rounded-lg border border-line bg-bg p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-muted">Claude, no tools</p>
          <blockquote className="mt-3 border-l-2 border-line-strong pl-3 text-sm text-fg">
            <p>“I don’t know. Approval depends on site-specific rules I can’t check from here.”</p>
            <p className="mt-1.5 text-muted">“26 ft may exceed this lot’s limit.”</p>
            <p className="mt-1.5 text-muted">
              “Ask the Association for this lot’s design limits and septic status before you make an offer.”
            </p>
          </blockquote>
        </div>
        <div className="flex flex-col rounded-lg border border-pass-line bg-bg p-4">
          <p className="font-mono text-xs uppercase tracking-wide text-pass">Claude with Lotline</p>
          <p className="mt-3 text-sm text-fg">
            <span className="font-mono text-fail">✕ Fail</span> · Height: limit 24 ft west of Hwy 1 (Sea Ranch Design
            Manual §6.3); your house is {p.heightFt} ft.
          </p>
          <p className="mt-auto pt-3 font-mono text-xs text-muted">Every fact links to its source.</p>
        </div>
      </div>
      <p className="font-mono text-xs text-faint">
        Left: real answer from Claude with no tools, 3 Oct 2026, quoted without edits. Right: Lotline’s stored verdict.
      </p>
    </div>
  );
}

function StepFlow() {
  return (
    <ol className="flex flex-col">
      {FLOW.map((step, i) => (
        <li key={step.name} className="relative flex gap-4 pb-5 last:pb-0">
          {i < FLOW.length - 1 ? (
            <span aria-hidden className="absolute left-[0.8125rem] top-8 bottom-1 border-l border-dashed border-line-strong" />
          ) : null}
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-bg font-mono text-xs tabular-nums text-muted"
          >
            {i + 1}
          </span>
          <span className="flex min-w-0 flex-col gap-1 pt-0.5">
            <span className="text-base font-medium text-fg">{step.name}</span>
            <span className="text-sm text-muted">
              <WithUnknown text={step.text} />
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function StepTry({
  lotCount,
  onSearch,
  onConnect,
}: {
  readonly lotCount: number | null;
  readonly onSearch: () => void;
  readonly onConnect: () => void;
}) {
  const p = DEFAULT_PROGRAM;
  const chips = [
    `${p.stories} stories`,
    `${p.heightFt} ft`,
    `${p.footprintSqFt.toLocaleString("en-US")} sq ft footprint`,
    `${p.deckSqFt} sq ft deck`,
    "under $400,000",
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-line bg-bg p-4">
        <p className="label">Your house</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip}
              className="inline-flex min-h-8 items-center rounded-md border border-line-strong bg-raised px-3 font-mono text-xs tabular-nums text-ink-200"
            >
              {chip}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-ink transition-colors duration-150 ease-out-quint hover:bg-accent-strong"
        >
          {lotCount === null ? "Search lots" : `Search ${lotCount} lots`}
          <svg aria-hidden viewBox="0 0 20 20" className="size-4">
            <path
              d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex min-h-11 items-center text-sm text-muted underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:text-fg sm:min-h-9"
        >
          Connect your agent
        </button>
      </div>
    </div>
  );
}

const TITLES = [
  "Today, your agent says “I don’t know.”",
  "How Lotline answers",
  "Try it",
] as const satisfies readonly string[];

export function OnboardingModal({ open, lotCount, onClose, onSearch, onConnect }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>(0);
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // The parent mounts this only while open, so every open starts at step 1.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => dialog.current?.focus());
    return () => {
      document.body.style.overflow = previous;
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  if (!open) return null;

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialog.current) return;
    const nodes = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog.current)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  const isLast = step === STEP_COUNT - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={onKeyDown}>
      <div aria-hidden className="modal-backdrop absolute inset-0 bg-bg/70 backdrop-blur-md" onClick={onClose} />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="modal-in relative flex max-h-[calc(100svh-2rem)] w-full max-w-[42.5rem] flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-raised outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
          <span className="font-mono text-xs tabular-nums text-faint">
            {step + 1} / {STEP_COUNT}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-md px-2 text-sm text-muted transition-colors duration-150 hover:text-fg sm:min-h-8"
          >
            Skip
          </button>
        </div>

        <div key={step} className="step-in min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <h2 id={titleId} className="text-balance text-2xl text-fg sm:text-3xl">
            {TITLES[step]}
          </h2>
          <div className="mt-5">
            {step === 0 ? <StepCompare /> : null}
            {step === 1 ? <StepFlow /> : null}
            {step === 2 ? <StepTry lotCount={lotCount} onSearch={onSearch} onConnect={onConnect} /> : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${STEP_COUNT}`} role="img">
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-1.5 rounded-full transition-all duration-200 ease-out-quint ${
                  i === step ? "w-5 bg-accent" : "w-1.5 bg-line-strong"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-muted transition-colors duration-150 hover:text-fg sm:min-h-9"
              >
                Back
              </button>
            ) : null}
            {isLast ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-md border border-line-strong px-3.5 text-sm text-fg transition-colors duration-150 hover:bg-raised sm:min-h-9"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => (s < STEP_COUNT - 1 ? ((s + 1) as Step) : s))}
                className="inline-flex min-h-11 items-center rounded-md border border-line-strong bg-raised px-3.5 text-sm text-fg transition-colors duration-150 hover:border-ink-500 sm:min-h-9"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Header link: reopens the tour at step 1 on the landing page, or goes there with ?tour=1. */
export function TourLink({ className }: { readonly className?: string }) {
  const pathname = usePathname();
  return (
    <a
      href="/?tour=1"
      onClick={(event) => {
        if (pathname !== "/") return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(TOUR_EVENT));
      }}
      className={className}
    >
      How it works
    </a>
  );
}

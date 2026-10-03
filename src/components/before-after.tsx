import { DEFAULT_PROGRAM } from "@/lib/client/types";

interface BeforeAfterProps {
  /** Null until a search has returned; the summary line is hidden until then. */
  readonly eliminatedCount: number | null;
  readonly openQuestions: number | null;
}

/**
 * Left column is a real, unedited excerpt: Claude with no tools, asked the prompt below on
 * 2026-10-03 (full answer in docs/submission/no-tools-answer.md). Right column is Lotline's stored
 * verdict for the same lot and program.
 */
export function BeforeAfter({ eliminatedCount, openQuestions }: BeforeAfterProps) {
  const p = DEFAULT_PROGRAM;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Prompt: “Can I build a {p.stories}-story house, {p.heightFt} ft tall, with a{" "}
        {p.footprintSqFt.toLocaleString("en-US")} sq ft footprint and a {p.deckSqFt} sq ft deck on 39463 Leeward Road,
        The Sea Ranch (0.39 ac)?”
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-lg border border-line-strong bg-surface p-5">
          <h3 className="font-mono text-xs uppercase tracking-wide text-muted">Claude, no tools</h3>
          <blockquote className="mt-4 border-l-2 border-line-strong pl-4 text-sm text-fg">
            <p>“I don’t know. Approval depends on site-specific rules I can’t check from here.”</p>
            <p className="mt-2 text-muted">“26 ft may exceed this lot’s limit.”</p>
            <p className="mt-2 text-muted">“Ask the Association for this lot’s design limits and septic status before you make an offer.”</p>
          </blockquote>
          <p className="mt-auto pt-5 font-mono text-xs text-muted">No verdict · no source · the buyer goes and asks</p>
        </div>
        <div className="flex flex-col rounded-lg border border-pass-line bg-surface p-5">
          <h3 className="font-mono text-xs uppercase tracking-wide text-pass">Claude with Lotline</h3>
          <p className="mt-4 text-sm text-fg">
            <span className="font-mono text-fail">✕ Fail</span> · Height: limit 24 ft west of Hwy 1 (Sea Ranch Design
            Manual §6.3); your house is {p.heightFt} ft.
          </p>
          <p className="mt-2 text-sm text-muted">No site visit needed for this lot.</p>
          {eliminatedCount !== null && openQuestions !== null ? (
            <p className="mt-auto pt-5 font-mono text-xs text-muted">
              Across all lots: {eliminatedCount} ruled out by a recorded rule · {openQuestions} open{" "}
              {openQuestions === 1 ? "question" : "questions"} routed to sellers · every fact sourced
            </p>
          ) : (
            <p className="mt-auto pt-5 font-mono text-xs text-muted">Every fact links to its source.</p>
          )}
        </div>
      </div>
      <p className="font-mono text-xs text-muted">
        Left: real answer from Claude with no tools, 3 Oct 2026, quoted without edits. Right: Lotline’s stored verdict.
      </p>
    </div>
  );
}

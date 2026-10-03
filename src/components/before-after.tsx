import { DEFAULT_PROGRAM } from "@/lib/client/types";

interface BeforeAfterProps {
  readonly eliminatedCount: number;
  readonly openQuestions: number;
}

export function BeforeAfter({ eliminatedCount, openQuestions }: BeforeAfterProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-fail-line bg-surface p-5">
        <h3 className="font-mono text-xs uppercase tracking-wide text-fail">Agent without spec</h3>
        <p className="mt-2 text-sm text-muted">
          Prompt: “Can I build a {DEFAULT_PROGRAM.heightFt} ft, {DEFAULT_PROGRAM.stories}-story house on this lot?”
        </p>
        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-fg marker:text-fail">
          <li>Reads the listing prose and answers with confidence.</li>
          <li>Invents setbacks and a height limit from general knowledge.</li>
          <li>Cites no source, so nothing can be checked.</li>
        </ul>
      </div>
      <div className="rounded-lg border border-pass-line bg-surface p-5">
        <h3 className="font-mono text-xs uppercase tracking-wide text-pass">With Lotline spec</h3>
        <p className="mt-2 text-sm text-muted">Same prompt, same lots.</p>
        <p className="mt-4 text-sm text-fg">
          A conditional answer: {eliminatedCount} {eliminatedCount === 1 ? "lot" : "lots"} ruled
          out by a recorded rule, {openQuestions} open{" "}
          {openQuestions === 1 ? "question" : "questions"} sent to the seller, and every fact links
          to its source.
        </p>
      </div>
    </div>
  );
}

import type { TraceEvent, TraceStatus } from "@/lib/contract";
import { formatMs } from "@/lib/client/format";

const DOT: Record<TraceStatus, string> = {
  running: "bg-accent dot-running",
  ok: "bg-pass",
  unknown: "bg-unknown",
  fail: "bg-fail",
};

const STATUS_TEXT: Record<TraceStatus, string> = {
  running: "running",
  ok: "ok",
  unknown: "unknown",
  fail: "failed",
};

interface TracePanelProps {
  readonly events: readonly TraceEvent[];
  /** Drafted seller question text, keyed by the trace event id that created it. */
  readonly questions: Readonly<Record<string, string>>;
  /** Final line, set once the run is complete. */
  readonly summary: string | null;
}

export function TracePanel({ events, questions, summary }: TracePanelProps) {
  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h3 className="font-mono text-xs uppercase tracking-wide text-muted">Agent tool calls</h3>
        <span className="font-mono text-xs text-muted">{events.length} calls</span>
      </div>
      <ol aria-live="polite" className="flex min-h-40 flex-col gap-1 px-4 py-3 font-mono text-xs">
        {events.length === 0 ? (
          <li className="font-sans text-sm text-muted">
            Run a lot to watch the agent call the tools.
          </li>
        ) : null}
        {events.map((event) => {
          const question = questions[event.id];
          return (
            <li key={event.id} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className={`mt-1 size-2 shrink-0 self-start rounded-full ${DOT[event.status]}`}
                />
                <span className="sr-only">{STATUS_TEXT[event.status]}</span>
                <span className="shrink-0 text-fg">{event.tool}</span>
                <span className="min-w-0 flex-1 break-words text-muted">{event.label}</span>
                <span className="shrink-0 tabular-nums text-muted">{formatMs(event.ms)}</span>
              </div>
              {question ? (
                <p className="question-in ml-4 rounded border border-unknown bg-unknown-soft px-2.5 py-1.5 font-sans text-sm text-fg">
                  <span className="font-mono text-xs text-unknown">Seller question drafted · </span>
                  {question}
                </p>
              ) : null}
            </li>
          );
        })}
        {summary ? (
          <li className="mt-2 border-t border-line pt-2 font-sans text-sm font-medium text-fg">
            {summary}
          </li>
        ) : null}
      </ol>
    </div>
  );
}

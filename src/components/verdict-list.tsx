"use client";

import { useState } from "react";
import type { BuildabilityResult, SourceRef } from "@/lib/contract";
import { VerdictBadge } from "@/components/verdict-badge";

function SourceLink({ source }: { readonly source: SourceRef }) {
  const text = source.page === null ? source.label : `${source.label}, p. ${source.page}`;
  if (source.url === null) {
    return <span className="text-muted">{text}</span>;
  }
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2"
    >
      {text}
    </a>
  );
}

export function VerdictList({ result }: { readonly result: BuildabilityResult }) {
  const [view, setView] = useState<"readable" | "json">("readable");

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h3 className="font-mono text-xs uppercase tracking-wide text-muted">Verdict</h3>
          <VerdictBadge verdict={result.overall} />
        </div>
        <div role="group" aria-label="Verdict view" className="flex rounded border border-line text-xs">
          {(["readable", "json"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={`px-3 py-1 font-mono ${view === option ? "bg-surface-2 text-fg" : "text-muted"}`}
            >
              {option === "json" ? "JSON" : "Readable"}
            </button>
          ))}
        </div>
      </div>

      {view === "json" ? (
        <pre className="max-h-96 overflow-auto px-4 py-3 font-mono text-xs text-fg">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : (
        <ul>
          {result.checks.map((check) => (
            <li
              key={check.rule}
              className="flex flex-col gap-1.5 border-t border-line px-4 py-3 first:border-t-0"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-fg">{check.label}</span>
                <VerdictBadge verdict={check.verdict} />
              </div>
              <p className="text-sm text-muted">{check.detail}</p>
              <p className="text-xs text-muted">
                Source:{" "}
                {check.sources.map((source, index) => (
                  <span key={`${source.label}-${index}`}>
                    {index > 0 ? ", " : null}
                    <SourceLink source={source} />
                  </span>
                ))}
                {check.questionId !== null ? (
                  <span className="ml-2 font-mono text-unknown">question open</span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

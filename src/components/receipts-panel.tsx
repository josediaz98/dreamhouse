"use client";

import { useEffect, useState } from "react";
import type { CallReceipt } from "@/lib/contract";
import { USE_FIXTURES, listCalls } from "@/lib/client/api";
import { formatCallUsd } from "@/lib/client/format";
import { DemoBadge } from "@/components/demo-badge";
import { ErrorBanner } from "@/components/error-banner";

/** `version` changes whenever the lots refresh, which is when new calls were logged. */
export function ReceiptsPanel({ version }: { readonly version: number }) {
  const [calls, setCalls] = useState<readonly CallReceipt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listCalls()
      .then((next) => {
        if (cancelled) return;
        setCalls(next);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load receipts");
      });
    return () => {
      cancelled = true;
    };
  }, [version, reload]);

  const load = () => setReload((n) => n + 1);

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h3 className="font-mono text-xs uppercase tracking-wide text-muted">Call receipts</h3>
        <div className="flex items-center gap-2">
          {USE_FIXTURES ? <DemoBadge /> : null}
          <button
            type="button"
            onClick={load}
            className="rounded border border-line-strong px-2.5 py-1 text-xs text-fg hover:bg-raised"
          >
            Refresh
          </button>
        </div>
      </div>
      {error ? (
        <div className="p-4">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      ) : calls === null ? (
        <p className="px-4 py-6 text-sm text-muted">Loading receipts…</p>
      ) : calls.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">No calls yet. Run a lot above.</p>
      ) : (
        <ul className="max-h-72 overflow-y-auto font-mono text-xs">
          {calls.slice(0, 20).map((call) => (
            <li
              key={call.id}
              className="flex items-center gap-3 border-t border-line px-4 py-2 first:border-t-0"
            >
              <span className="w-20 shrink-0 text-muted tabular-nums">
                {new Date(call.ts).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span className="min-w-0 flex-1 truncate text-fg">{call.tool}</span>
              <span className="shrink-0 tabular-nums text-fg">{formatCallUsd(call.amountUsd)}</span>
              <span className="hidden w-36 shrink-0 truncate text-muted sm:block">
                {call.paymentRef ?? "free"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

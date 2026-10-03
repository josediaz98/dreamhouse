"use client";

import { useState } from "react";

const INSTALL_LINE =
  "claude mcp add --transport http dreamhouse https://dreamhouse-chi.vercel.app/mcp";

export function Hero() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(INSTALL_LINE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the line stays selectable.
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
      <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl">
        Can I build on this lot? Your agent can finally answer.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Agent-readable property specs for coastal land. MCP server + pay-per-call API.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <a
          href="#demo"
          className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-3 text-sm font-semibold text-accent-fg hover-accent-strong"
        >
          Try the live demo
        </a>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface py-1.5 pl-3 pr-1.5 sm:max-w-3xl">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-fg sm:text-sm">
            {INSTALL_LINE}
          </code>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 rounded border border-line-strong px-3 py-1.5 text-xs text-fg hover-surface-2"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </section>
  );
}

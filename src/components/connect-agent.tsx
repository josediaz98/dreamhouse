"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CopyButton } from "@/components/copy-button";

const MCP_URL = "https://dreamhouse-chi.vercel.app/mcp";

type ConnectTab = "claude" | "curl" | "mcp";

interface TabContent {
  readonly label: string;
  readonly hint: string;
  readonly code: string;
}

const TABS = {
  claude: {
    label: "Claude Code",
    hint: "Add Lotline as an MCP server, then ask Claude about a lot.",
    code: `claude mcp add --transport http lotline ${MCP_URL}`,
  },
  curl: {
    label: "cURL",
    hint: "Search lots for a 26 ft, 2-story house over plain HTTP.",
    code: [
      "curl -X POST https://dreamhouse-chi.vercel.app/api/tools/search_properties \\",
      "  -H 'content-type: application/json' \\",
      `  -d '{"maxPriceUsd":400000,"program":{"footprintSqFt":2155,"deckSqFt":400,"heightFt":26,"stories":2}}'`,
    ].join("\n"),
  },
  mcp: {
    label: "MCP URL",
    hint: "Streamable HTTP endpoint for any MCP client.",
    code: MCP_URL,
  },
} as const satisfies Record<ConnectTab, TabContent>;

const TAB_ORDER = ["claude", "curl", "mcp"] as const satisfies readonly ConnectTab[];

export function ConnectAgent() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ConnectTab>("claude");
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (root.current && event.target instanceof Node && !root.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const content = TABS[tab];

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong px-3 text-sm font-medium text-fg transition-colors duration-150 ease-out-quint hover:bg-raised sm:min-h-9 sm:px-3.5"
      >
        <span className="sm:hidden">Connect</span>
        <span className="max-sm:hidden">Connect your agent</span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`size-3 text-muted transition-transform duration-200 ease-out-quint ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Connect your agent"
          className="popover-in absolute right-0 top-full z-30 mt-2 w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-line-strong bg-surface shadow-raised"
        >
          <div role="tablist" aria-label="Connection method" className="flex gap-1 border-b border-line p-1.5">
            {TAB_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`min-h-11 flex-1 rounded-md px-3 text-sm transition-colors duration-150 sm:min-h-9 ${
                  tab === key ? "bg-raised text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {TABS[key].label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="flex flex-col gap-3 p-4">
            <p className="text-sm text-muted">{content.hint}</p>
            <div className="flex items-start gap-2 rounded-md border border-line bg-bg p-2 pl-3">
              <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre py-1.5 font-mono text-xs leading-5 text-fg">
                {content.code}
              </pre>
              <CopyButton text={content.code} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

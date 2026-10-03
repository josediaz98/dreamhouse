"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { readonly text: string; readonly label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the text stays selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="min-h-11 shrink-0 rounded-md border border-line-strong px-3 font-mono text-xs text-fg transition-colors duration-150 hover:bg-raised sm:min-h-8"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

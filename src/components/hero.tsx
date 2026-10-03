import type { ReactNode } from "react";

interface HeroProps {
  /** Indexed lots, from the live API. Null while loading or when the count is unavailable. */
  readonly lotCount: number | null;
  /** The command box. */
  readonly children: ReactNode;
}

export function Hero({ lotCount, children }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center px-4 pb-16 pt-12 text-center sm:px-6 sm:pb-24 sm:pt-16"
    >
      <p className="inline-flex min-h-8 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 font-mono text-xs text-muted max-sm:tracking-tight">
        <span aria-hidden className="size-1.5 rounded-full bg-pass max-sm:hidden" />
        <span>
          The Sea Ranch, CA
          {lotCount === null ? null : (
            <>
              {" · "}
              <span className="tabular-nums text-fg">{lotCount}</span> lots
            </>
          )}
          {" · "}live county data
        </span>
      </p>

      <h1
        id="hero-heading"
        className="mt-7 text-balance text-4xl leading-[1.05] text-fg sm:text-5xl xl:text-[4.5rem] xl:leading-[1.04]"
      >
        <span className="block">Can I build on this lot?</span>
        <span className="block text-accent">Your agent can finally answer.</span>
      </h1>

      <p className="mt-6 max-w-3xl text-pretty text-base text-muted sm:text-lg">
        Agent-readable property specs for coastal land. Every fact sourced. Every unknown explicit.
      </p>

      <div className="mt-10 flex w-full justify-center sm:mt-12">{children}</div>
    </section>
  );
}
